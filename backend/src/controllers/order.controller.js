const { query, queryOne, transaction } = require('../config/database');
const { genReference, genCodeRetrait } = require('../utils/helpers');
const { creer: creerNotif } = require('../services/notification.service');

// POST /api/commandes
const creerCommande = async (req, res) => {
  try {
    const { items, mode_livraison, adresse_id, relais_id, notes, utiliser_points, methode_paiement } = req.body;
    if (!items?.length) return res.status(400).json({ succes: false, message: 'Panier vide.' });

    // Valider les produits
    let montantProduits = 0;
    const itemsValides = [];
    for (const item of items) {
      const prod = await queryOne(
        `SELECT p.id, p.nom, p.prix, p.prix_promo, p.stock, p.boutique_id, pi.url as image
         FROM produits p
         LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
         WHERE p.id = ? AND p.statut = 'publie'`,
        [item.produit_id]
      );
      if (!prod) return res.status(400).json({ succes: false, message: `Produit ${item.produit_id} indisponible.` });
      if (prod.stock < item.quantite) return res.status(400).json({ succes: false, message: `Stock insuffisant pour ${prod.nom}.` });
      const prix = prod.prix_promo || prod.prix;
      const sousTotal = prix * item.quantite;
      montantProduits += sousTotal;
      itemsValides.push({ ...prod, quantite: item.quantite, prix_unitaire: prix, sous_total: sousTotal });
    }

    const config = await queryOne('SELECT valeur FROM config_systeme WHERE cle = "frais_livraison_base"');
    const fraisLivraison = parseFloat(config?.valeur || 1500);

    let reductionWallet = 0;
    if (utiliser_points) {
      const user = await queryOne('SELECT points_wallet FROM users WHERE id = ?', [req.user.id]);
      const pointsDispos = user.points_wallet;
      const cfgReduc = await queryOne('SELECT valeur FROM config_systeme WHERE cle = "reduction_filleul"');
      reductionWallet = Math.min(pointsDispos, parseFloat(cfgReduc?.valeur || 0));
    }

    const montantTotal = Math.max(0, montantProduits + fraisLivraison - reductionWallet);
    const reference = genReference('CMD');
    const codeRetrait = genCodeRetrait();

    const commandeId = await transaction(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO commandes (reference, client_id, mode_livraison, adresse_id, relais_id,
          code_retrait, montant_produits, frais_livraison, reduction_wallet, montant_total, notes_client)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reference, req.user.id, mode_livraison || 'point_relais', adresse_id || null,
         relais_id || null, codeRetrait, montantProduits, fraisLivraison, reductionWallet, montantTotal, notes || null]
      );
      const cid = r.insertId;

      for (const item of itemsValides) {
        await conn.execute(
          `INSERT INTO commande_items (commande_id, produit_id, boutique_id, nom_produit, image_url, prix_unitaire, quantite, sous_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cid, item.id, item.boutique_id, item.nom, item.image || null, item.prix_unitaire, item.quantite, item.sous_total]
        );
        await conn.execute('UPDATE produits SET stock = stock - ? WHERE id = ?', [item.quantite, item.id]);
      }

      await conn.execute(
        'INSERT INTO paiements (commande_id, methode, montant) VALUES (?, ?, ?)',
        [cid, methode_paiement || 'mtn_momo', montantTotal]
      );

      return cid;
    });

    await creerNotif(req.user.id, '🛒 Commande créée', `Commande ${reference} en attente de paiement.`, 'commande');

    return res.status(201).json({ succes: true, reference, commande_id: commandeId, montant_total: montantTotal });
  } catch (err) {
    console.error('[Commande] Créer:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/commandes
const mesCommandes = async (req, res) => {
  const commandes = await query(
    `SELECT c.*, p.statut as paiement_statut
     FROM commandes c LEFT JOIN paiements p ON p.commande_id = c.id
     WHERE c.client_id = ? ORDER BY c.date_commande DESC`,
    [req.user.id]
  );
  res.json({ succes: true, commandes });
};

// GET /api/commandes/:id
const getCommande = async (req, res) => {
  const commande = await queryOne('SELECT * FROM commandes WHERE id = ? AND client_id = ?', [req.params.id, req.user.id]);
  if (!commande) return res.status(404).json({ succes: false, message: 'Commande introuvable.' });
  const items = await query('SELECT * FROM commande_items WHERE commande_id = ?', [commande.id]);
  const paiement = await queryOne('SELECT statut, methode, date_paiement FROM paiements WHERE commande_id = ?', [commande.id]);
  res.json({ succes: true, commande, items, paiement });
};

// POST /api/commandes/:id/annuler
const annulerCommande = async (req, res) => {
  const commande = await queryOne(
    'SELECT * FROM commandes WHERE id = ? AND client_id = ? AND statut IN ("en_attente_paiement","payee")',
    [req.params.id, req.user.id]
  );
  if (!commande) return res.status(404).json({ succes: false, message: 'Commande non annulable.' });
  await query('UPDATE commandes SET statut = "annulee" WHERE id = ?', [commande.id]);
  // Remettre le stock
  const items = await query('SELECT * FROM commande_items WHERE commande_id = ?', [commande.id]);
  for (const item of items) {
    await query('UPDATE produits SET stock = stock + ? WHERE id = ?', [item.quantite, item.produit_id]);
  }
  res.json({ succes: true });
};

// POST /api/commandes/:id/litige
const ouvrirLitige = async (req, res) => {
  const { motif, description } = req.body;
  const commande = await queryOne(
    'SELECT c.*, ci.boutique_id FROM commandes c JOIN commande_items ci ON ci.commande_id = c.id WHERE c.id = ? AND c.client_id = ? AND c.statut IN ("livree","au_relais") LIMIT 1',
    [req.params.id, req.user.id]
  );
  if (!commande) return res.status(404).json({ succes: false, message: 'Commande non éligible au litige.' });

  const boutique = await queryOne('SELECT vendeur_id FROM boutiques WHERE id = ?', [commande.boutique_id]);
  const reference = genReference('LIT');

  await query(
    `INSERT INTO litiges (reference, commande_id, client_id, vendeur_id, motif, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reference, commande.id, req.user.id, boutique.vendeur_id, motif, description]
  );
  res.status(201).json({ succes: true, reference });
};

// POST /api/commandes/:id/confirmer-reception
const confirmerReception = async (req, res) => {
  try {
    const { libererEscrow } = require('../services/payment.service');
    const commande = await queryOne(
      'SELECT * FROM commandes WHERE id = ? AND client_id = ? AND statut IN ("expediee","au_relais","livree")',
      [req.params.id, req.user.id]
    );
    if (!commande) return res.status(404).json({ succes: false, message: 'Commande introuvable ou non éligible.' });

    const paiement = await queryOne(
      'SELECT escrow_libere FROM paiements WHERE commande_id = ?',
      [commande.id]
    );
    if (paiement?.escrow_libere) return res.status(400).json({ succes: false, message: 'Déjà confirmée.' });

    const result = await libererEscrow(commande.id);
    if (!result.succes) return res.status(400).json(result);

    await creerNotif(req.user.id, '✅ Réception confirmée', `Commande ${commande.reference} confirmée. Merci !`, 'commande');
    return res.json({ succes: true });
  } catch (err) {
    console.error('[Commande] ConfirmerReception:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/commandes/relais
const getRelais = async (_req, res) => {
  const relais = await query('SELECT id, nom, adresse, commune, ville, telephone, heures, colis_en_attente FROM points_relais WHERE est_actif = TRUE');
  res.json({ succes: true, relais });
};

module.exports = { creerCommande, mesCommandes, getCommande, annulerCommande, ouvrirLitige, getRelais, confirmerReception };
