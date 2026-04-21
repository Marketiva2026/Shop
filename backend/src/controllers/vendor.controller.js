const { query, queryOne, transaction } = require('../config/database');
const { slugify, genReference } = require('../utils/helpers');
const { cloudinary } = require('../config/cloudinary');
const { creer: creerNotif } = require('../services/notification.service');

// POST /api/vendeur/boutique
const creerBoutique = async (req, res) => {
  const { nom, description, ville, adresse, telephone, email } = req.body;
  const existing = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (existing) return res.status(409).json({ succes: false, message: 'Vous avez déjà une boutique.' });

  let slug = slugify(nom);
  const exists = await queryOne('SELECT id FROM boutiques WHERE slug = ?', [slug]);
  if (exists) slug = `${slug}-${Date.now()}`;

  const r = await query(
    `INSERT INTO boutiques (vendeur_id, nom, slug, description, ville, adresse, telephone, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, nom.trim(), slug, description || null, ville || null, adresse || null, telephone || null, email || null]
  );

  await query('UPDATE users SET role = "vendeur" WHERE id = ?', [req.user.id]);
  res.status(201).json({ succes: true, boutique_id: r.insertId, slug });
};

// GET /api/vendeur/boutique
const getMaBoutique = async (req, res) => {
  const boutique = await queryOne('SELECT * FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false, message: 'Boutique introuvable.' });
  res.json({ succes: true, boutique });
};

// PUT /api/vendeur/boutique
const updateBoutique = async (req, res) => {
  const { nom, description, ville, adresse, telephone, email } = req.body;
  await query(
    'UPDATE boutiques SET nom=?, description=?, ville=?, adresse=?, telephone=?, email=? WHERE vendeur_id=?',
    [nom, description, ville, adresse, telephone, email, req.user.id]
  );
  res.json({ succes: true });
};

// GET /api/vendeur/dashboard
const getDashboard = async (req, res) => {
  const boutique = await queryOne('SELECT * FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false });

  const [totalProduits, totalCommandes, commandesEnCours, revenus] = await Promise.all([
    queryOne('SELECT COUNT(*) as n FROM produits WHERE boutique_id = ?', [boutique.id]),
    queryOne('SELECT COUNT(*) as n FROM commande_items WHERE boutique_id = ?', [boutique.id]),
    queryOne(`SELECT COUNT(DISTINCT ci.commande_id) as n FROM commande_items ci
              JOIN commandes c ON c.id = ci.commande_id
              WHERE ci.boutique_id = ? AND c.statut NOT IN ('livree','annulee','remboursee')`, [boutique.id]),
    queryOne('SELECT COALESCE(SUM(sous_total),0) as total FROM commande_items ci JOIN commandes c ON c.id = ci.commande_id WHERE ci.boutique_id = ? AND c.statut = "livree"', [boutique.id]),
  ]);

  res.json({
    succes: true,
    stats: {
      total_produits: totalProduits.n,
      total_commandes: totalCommandes.n,
      commandes_en_cours: commandesEnCours.n,
      revenus_total: revenus.total,
      wallet_solde: boutique.wallet_solde,
    },
    boutique,
  });
};

// POST /api/vendeur/produits
const creerProduit = async (req, res) => {
  const boutique = await queryOne('SELECT id, statut FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false, message: 'Créez d\'abord votre boutique.' });
  if (boutique.statut !== 'active') return res.status(403).json({ succes: false, message: 'Boutique non active.' });

  const { nom, categorie_id, description, description_courte, prix, prix_promo, stock, est_import_chine } = req.body;
  let slug = slugify(nom);
  const exists = await queryOne('SELECT id FROM produits WHERE slug = ?', [slug]);
  if (exists) slug = `${slug}-${Date.now()}`;

  const r = await query(
    `INSERT INTO produits (boutique_id, categorie_id, nom, slug, description, description_courte, prix, prix_promo, stock, est_import_chine, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
    [boutique.id, categorie_id, nom.trim(), slug, description, description_courte, prix, prix_promo || null, stock || 0, est_import_chine ? 1 : 0]
  );
  res.status(201).json({ succes: true, produit_id: r.insertId, slug });
};

// GET /api/vendeur/produits
const getMesProduits = async (req, res) => {
  const boutique = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.json({ succes: true, produits: [] });
  const produits = await query(
    `SELECT p.*, pi.url as image_principale
     FROM produits p
     LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
     WHERE p.boutique_id = ? ORDER BY p.cree_le DESC`,
    [boutique.id]
  );
  res.json({ succes: true, produits });
};

// PUT /api/vendeur/produits/:id
const updateProduit = async (req, res) => {
  const boutique = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false });
  const produit = await queryOne('SELECT id FROM produits WHERE id = ? AND boutique_id = ?', [req.params.id, boutique.id]);
  if (!produit) return res.status(404).json({ succes: false, message: 'Produit introuvable.' });

  const { nom, description, description_courte, prix, prix_promo, stock, categorie_id } = req.body;
  await query(
    `UPDATE produits SET nom=?, description=?, description_courte=?, prix=?, prix_promo=?, stock=?,
     categorie_id=?, statut='en_attente' WHERE id=?`,
    [nom, description, description_courte, prix, prix_promo || null, stock, categorie_id, req.params.id]
  );
  res.json({ succes: true });
};

// DELETE /api/vendeur/produits/:id
const deleteProduit = async (req, res) => {
  const boutique = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false });
  await query('UPDATE produits SET statut = "archive" WHERE id = ? AND boutique_id = ?', [req.params.id, boutique.id]);
  res.json({ succes: true });
};

// POST /api/vendeur/produits/:id/images
const uploadImages = async (req, res) => {
  const boutique = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false });
  const produit = await queryOne('SELECT id FROM produits WHERE id = ? AND boutique_id = ?', [req.params.id, boutique.id]);
  if (!produit) return res.status(404).json({ succes: false });

  const files = req.files || [];
  const existing = await queryOne('SELECT COUNT(*) as n FROM produit_images WHERE produit_id = ?', [produit.id]);

  const imageIds = [];
  for (let i = 0; i < files.length; i++) {
    const isPrincipal = existing.n === 0 && i === 0;
    const r = await query(
      'INSERT INTO produit_images (produit_id, url, public_id, est_principale, ordre) VALUES (?, ?, ?, ?, ?)',
      [produit.id, files[i].path, files[i].filename, isPrincipal ? 1 : 0, existing.n + i]
    );
    imageIds.push(r.insertId);
  }
  res.json({ succes: true, images: imageIds });
};

// DELETE /api/vendeur/produits/:id/images/:img_id
const deleteImage = async (req, res) => {
  const img = await queryOne('SELECT * FROM produit_images WHERE id = ?', [req.params.img_id]);
  if (!img) return res.status(404).json({ succes: false });
  if (process.env.CLOUDINARY_KEY) {
    await cloudinary.uploader.destroy(img.public_id).catch(() => {});
  }
  await query('DELETE FROM produit_images WHERE id = ?', [req.params.img_id]);
  res.json({ succes: true });
};

// GET /api/vendeur/commandes
const getMesCommandes = async (req, res) => {
  const boutique = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.json({ succes: true, commandes: [] });
  const commandes = await query(
    `SELECT c.reference, c.statut, c.date_commande, c.montant_total,
            ci.nom_produit, ci.quantite, ci.sous_total, ci.statut_vendeur, ci.id as item_id
     FROM commande_items ci
     JOIN commandes c ON c.id = ci.commande_id
     WHERE ci.boutique_id = ? ORDER BY c.date_commande DESC`,
    [boutique.id]
  );
  res.json({ succes: true, commandes });
};

// PATCH /api/vendeur/commandes/:id/statut
const updateStatutCommande = async (req, res) => {
  const { statut } = req.body;
  const valid = ['prepare', 'expedie'];
  if (!valid.includes(statut)) return res.status(400).json({ succes: false, message: 'Statut invalide.' });
  await query('UPDATE commande_items SET statut_vendeur = ? WHERE id = ?', [statut, req.params.id]);
  res.json({ succes: true });
};

// GET /api/vendeur/wallet
const getWallet = async (req, res) => {
  const boutique = await queryOne('SELECT wallet_solde FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  const retraits = await query('SELECT * FROM retraits_vendeurs WHERE vendeur_id = ? ORDER BY cree_le DESC LIMIT 20', [req.user.id]);
  res.json({ succes: true, solde: boutique?.wallet_solde || 0, retraits });
};

// POST /api/vendeur/retraits
const demanderRetrait = async (req, res) => {
  const { montant, methode, numero } = req.body;
  const boutique = await queryOne('SELECT id, wallet_solde FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.status(404).json({ succes: false });
  if (boutique.wallet_solde < montant) return res.status(400).json({ succes: false, message: 'Solde insuffisant.' });

  await query(
    'INSERT INTO retraits_vendeurs (vendeur_id, boutique_id, montant, methode, numero) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, boutique.id, montant, methode, numero]
  );
  await query('UPDATE boutiques SET wallet_solde = wallet_solde - ? WHERE id = ?', [montant, boutique.id]);
  res.status(201).json({ succes: true });
};

// GET /api/vendeur/avis
const getAvis = async (req, res) => {
  const boutique = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [req.user.id]);
  if (!boutique) return res.json({ succes: true, avis: [] });
  const avis = await query(
    `SELECT a.*, p.nom as produit_nom, u.nom_complet as client_nom
     FROM avis a JOIN produits p ON p.id = a.produit_id JOIN users u ON u.id = a.client_id
     WHERE p.boutique_id = ? ORDER BY a.cree_le DESC`,
    [boutique.id]
  );
  res.json({ succes: true, avis });
};

module.exports = {
  creerBoutique, getMaBoutique, updateBoutique, getDashboard,
  creerProduit, getMesProduits, updateProduit, deleteProduit,
  uploadImages, deleteImage,
  getMesCommandes, updateStatutCommande,
  getWallet, demanderRetrait, getAvis,
};
