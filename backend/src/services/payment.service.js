const crypto = require('crypto');
const axios = require('axios');
const { query, queryOne, transaction } = require('../config/database');
const { creer: creerNotif } = require('./notification.service');
const { crediterParrainageAchat } = require('./wallet.service');

const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payment';

const initierPaiement = async (commande, methode) => {
  const transactionId = `MKV-${commande.reference}-${Date.now()}`;

  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: transactionId,
    amount: Math.round(commande.montant_total),
    currency: 'XOF',
    description: `Commande MARKETIVA ${commande.reference}`,
    return_url: `${process.env.FRONTEND_URL}/paiement/retour`,
    notify_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/paiements/webhook/cinetpay`,
    channels: methode.toUpperCase(),
    metadata: JSON.stringify({ commande_id: commande.id }),
  };

  if (process.env.NODE_ENV !== 'production') {
    // Mode démo
    await query(
      'UPDATE paiements SET reference_cinetpay = ?, statut = ? WHERE commande_id = ?',
      [transactionId, 'en_attente', commande.id]
    );
    return {
      demo: true,
      payment_url: `${process.env.FRONTEND_URL}/paiement/demo?ref=${transactionId}`,
      transaction_id: transactionId,
    };
  }

  const { data } = await axios.post(CINETPAY_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (data.code !== '201') {
    throw new Error(data.message || 'Erreur CinetPay');
  }

  await query(
    'UPDATE paiements SET reference_cinetpay = ? WHERE commande_id = ?',
    [transactionId, commande.id]
  );

  return { payment_url: data.data.payment_url, transaction_id: transactionId };
};

const verifierSignatureWebhook = (payload, signature) => {
  const secret = process.env.CINETPAY_WEBHOOK_SECRET || '';
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return computed === signature;
};

const traiterWebhook = async (payload) => {
  const { cpm_trans_id, cpm_result, cpm_amount } = payload;
  if (!cpm_trans_id) return;

  const paiement = await queryOne(
    'SELECT p.*, c.client_id, c.reference FROM paiements p JOIN commandes c ON c.id = p.commande_id WHERE p.reference_cinetpay = ?',
    [cpm_trans_id]
  );
  if (!paiement) return;

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

    await creerNotif(
      paiement.client_id,
      '✅ Paiement confirmé',
      `Votre commande ${paiement.reference} a été payée.`,
      'paiement'
    );
  } else {
    await query(
      'UPDATE paiements SET statut = ? WHERE id = ?',
      ['echec', paiement.id]
    );
  }
};

const libererEscrow = async (commandeId) => {
  const commande = await queryOne(
    'SELECT c.*, p.id as paiement_id FROM commandes c JOIN paiements p ON p.commande_id = c.id WHERE c.id = ? AND p.escrow_libere = FALSE',
    [commandeId]
  );
  if (!commande) return { succes: false, message: 'Commande introuvable ou déjà libérée' };

  const items = await query(
    'SELECT ci.*, b.id as boutique_id, b.commission_taux FROM commande_items ci JOIN boutiques b ON b.id = ci.boutique_id WHERE ci.commande_id = ?',
    [commandeId]
  );

  await transaction(async (conn) => {
    for (const item of items) {
      const commission = item.commission_taux / 100;
      const netVendeur = item.sous_total * (1 - commission);
      await conn.execute(
        'UPDATE boutiques SET wallet_solde = wallet_solde + ? WHERE id = ?',
        [netVendeur, item.boutique_id]
      );
    }
    await conn.execute(
      'UPDATE paiements SET escrow_libere = TRUE, statut = ?, date_liberation = NOW() WHERE id = ?',
      ['libere', commande.paiement_id]
    );
    await conn.execute(
      'UPDATE commandes SET statut = ?, date_livraison_reelle = NOW() WHERE id = ?',
      ['livree', commandeId]
    );
  });

  // Déclencher parrainage
  await crediterParrainageAchat(commande);

  return { succes: true };
};

module.exports = { initierPaiement, verifierSignatureWebhook, traiterWebhook, libererEscrow };
