const crypto = require('crypto');
const axios  = require('axios');
const { query, queryOne, transaction } = require('../config/database');
const { creer: creerNotif }            = require('./notification.service');
const { crediterParrainageAchat }      = require('./wallet.service');
const { envoyerEmailAsync, templates } = require('./email.service');

const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payment';

// ─── Initiation paiement ────────────────────────────────────────────────────

const initierPaiement = async (commande, methode) => {
  const transactionId = `MKV-${commande.reference}-${Date.now()}`;

  const payload = {
    apikey:         process.env.CINETPAY_API_KEY,
    site_id:        process.env.CINETPAY_SITE_ID,
    transaction_id: transactionId,
    amount:         Math.round(commande.montant_total),
    currency:       'XOF',
    description:    `Commande MARKETIVA ${commande.reference}`,
    return_url:     `${process.env.FRONTEND_URL}/paiement/retour`,
    notify_url:     `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/paiements/webhook/cinetpay`,
    channels:       methode.toUpperCase(),
    metadata:       JSON.stringify({ commande_id: commande.id }),
  };

  if (process.env.NODE_ENV !== 'production') {
    await query(
      'UPDATE paiements SET reference_cinetpay = ?, statut = ? WHERE commande_id = ?',
      [transactionId, 'en_attente', commande.id]
    );
    return {
      demo:           true,
      payment_url:    `${process.env.FRONTEND_URL}/paiement/demo?ref=${transactionId}`,
      transaction_id: transactionId,
    };
  }

  const { data } = await axios.post(CINETPAY_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (data.code !== '201') throw new Error(data.message || 'Erreur CinetPay');

  await query(
    'UPDATE paiements SET reference_cinetpay = ? WHERE commande_id = ?',
    [transactionId, commande.id]
  );
  return { payment_url: data.data.payment_url, transaction_id: transactionId };
};

// ─── Vérification signature webhook ─────────────────────────────────────────

const verifierSignatureWebhook = (payload, signature) => {
  const secret   = process.env.CINETPAY_WEBHOOK_SECRET || '';
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return computed === signature;
};

// ─── Traitement webhook — IDEMPOTENT ─────────────────────────────────────────
// Protection contre le double-traitement :
// On tente d'INSÉRer dans payment_events avec une contrainte UNIQUE sur
// transaction_id. Si CinetPay renvoit le même webhook deux fois, le second
// INSERT lève ER_DUP_ENTRY et on sort sans rien modifier.
// L'atomicité est garantie par la DB engine — pas par le code applicatif.

const traiterWebhook = async (payload) => {
  const { cpm_trans_id, cpm_result } = payload;
  if (!cpm_trans_id) return;

  // 1. Verrou idempotency — atomic INSERT
  try {
    await query(
      `INSERT INTO payment_events (transaction_id, provider, statut, payload)
       VALUES (?, 'cinetpay', ?, ?)`,
      [
        cpm_trans_id,
        cpm_result === '00' ? 'success' : 'failed',
        JSON.stringify(payload),
      ]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.warn('[Webhook] Doublon ignoré — transaction déjà traitée:', cpm_trans_id);
      return; // safe: no-op
    }
    throw err; // unexpected — re-throw
  }

  // 2. Récupérer le paiement associé
  const paiement = await queryOne(
    `SELECT p.*, c.client_id, c.reference, u.email as client_email, u.nom_complet as client_nom
     FROM paiements p
     JOIN commandes c ON c.id = p.commande_id
     JOIN users     u ON u.id = c.client_id
     WHERE p.reference_cinetpay = ?`,
    [cpm_trans_id]
  );
  if (!paiement) {
    console.error('[Webhook] Aucun paiement trouvé pour transaction_id:', cpm_trans_id);
    return;
  }

  // 3. Traiter selon résultat CinetPay
  if (cpm_result === '00') {
    await transaction(async (conn) => {
      await conn.execute(
        'UPDATE paiements SET statut = ?, date_paiement = NOW() WHERE id = ?',
        ['capture', paiement.id]
      );
      await conn.execute(
        'UPDATE commandes SET statut = ?, date_paiement = NOW() WHERE id = ?',
        ['payee', paiement.commande_id]
      );
    });

    // Notifications (non-bloquantes)
    creerNotif(
      paiement.client_id,
      '✅ Paiement confirmé',
      `Votre commande ${paiement.reference} a été payée avec succès.`,
      'paiement'
    ).catch(() => {});

    envoyerEmailAsync(
      paiement.client_email,
      'Paiement confirmé — MARKETIVA',
      templates.paiementConfirme(paiement.client_nom, paiement.reference, paiement.montant)
    );
  } else {
    await query(
      'UPDATE paiements SET statut = ? WHERE id = ?',
      ['echec', paiement.id]
    );
    console.warn('[Webhook] Paiement échoué pour commande:', paiement.reference);
  }
};

// ─── Libération escrow ───────────────────────────────────────────────────────

const libererEscrow = async (commandeId) => {
  // 1. Vérifier qu'il n'y a pas de litige actif — escrow bloqué si litige ouvert
  const litigeActif = await queryOne(
    `SELECT id, reference FROM litiges
     WHERE commande_id = ? AND statut IN ('ouvert','en_cours','escalade')`,
    [commandeId]
  );
  if (litigeActif) {
    console.warn('[Escrow] Bloqué — litige actif:', litigeActif.reference, 'sur commande:', commandeId);
    return { succes: false, message: 'Litige en cours — escrow bloqué.', code: 'DISPUTE_ACTIVE' };
  }

  // 2. Récupérer commande + paiement
  const commande = await queryOne(
    `SELECT c.*, p.id as paiement_id, u.email as client_email, u.nom_complet as client_nom
     FROM commandes c
     JOIN paiements p ON p.commande_id = c.id
     JOIN users     u ON u.id = c.client_id
     WHERE c.id = ? AND p.escrow_libere = FALSE`,
    [commandeId]
  );
  if (!commande) return { succes: false, message: 'Commande introuvable ou escrow déjà libéré.' };

  // 3. Récupérer les items avec commission par boutique
  const items = await query(
    `SELECT ci.*, b.id as boutique_id, b.commission_taux, b.vendeur_id,
            u.email as vendeur_email, u.nom_complet as vendeur_nom
     FROM commande_items ci
     JOIN boutiques b ON b.id = ci.boutique_id
     JOIN users     u ON u.id = b.vendeur_id
     WHERE ci.commande_id = ?`,
    [commandeId]
  );

  // 4. Libération atomique — toutes les mises à jour dans une transaction
  await transaction(async (conn) => {
    for (const item of items) {
      const commission = item.commission_taux / 100;
      const netVendeur = parseFloat((item.sous_total * (1 - commission)).toFixed(2));

      await conn.execute(
        'UPDATE boutiques SET wallet_solde = wallet_solde + ? WHERE id = ?',
        [netVendeur, item.boutique_id]
      );

      // Historique wallet vendeur (table wallet_transactions n'est que pour clients,
      // les vendeurs ont boutiques.wallet_solde + retraits_vendeurs)
    }

    await conn.execute(
      `UPDATE paiements
       SET escrow_libere = TRUE, statut = 'libere', date_liberation = NOW()
       WHERE id = ?`,
      [commande.paiement_id]
    );

    await conn.execute(
      `UPDATE commandes
       SET statut = 'livree', date_livraison_reelle = NOW()
       WHERE id = ?`,
      [commandeId]
    );
  });

  // 5. Notifications vendeurs (une par boutique unique)
  const boutiquesNotifiees = new Set();
  for (const item of items) {
    if (boutiquesNotifiees.has(item.boutique_id)) continue;
    boutiquesNotifiees.add(item.boutique_id);

    creerNotif(
      item.vendeur_id,
      '💰 Paiement reçu',
      `L'escrow de la commande ${commande.reference} a été libéré sur votre wallet.`,
      'paiement'
    ).catch(() => {});

    envoyerEmailAsync(
      item.vendeur_email,
      'Paiement reçu sur votre wallet — MARKETIVA',
      templates.escrowLibere(item.vendeur_nom, commande.reference)
    );
  }

  // 6. Notification client
  creerNotif(
    commande.client_id,
    '✅ Livraison confirmée',
    `Merci pour votre commande ${commande.reference} !`,
    'commande'
  ).catch(() => {});

  envoyerEmailAsync(
    commande.client_email,
    'Livraison confirmée — MARKETIVA',
    templates.livraisonConfirmee(commande.client_nom, commande.reference)
  );

  // 7. Créditer parrainage
  await crediterParrainageAchat(commande);

  return { succes: true };
};

module.exports = { initierPaiement, verifierSignatureWebhook, traiterWebhook, libererEscrow };
