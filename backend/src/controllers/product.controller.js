const { query, queryOne } = require('../config/database');
const { paginate } = require('../utils/helpers');

// GET /api/produits
const lister = async (req, res) => {
  try {
    const { page = 1, limit = 20, categorie, min_prix, max_prix, q, boutique_id, import_chine } = req.query;
    const { offset, limit: lim } = paginate(page, limit);

    const conditions = ["p.statut = 'publie'", 'b.statut = "active"'];
    const params = [];

    if (categorie) { conditions.push('p.categorie_id = ?'); params.push(categorie); }
    if (min_prix) { conditions.push('p.prix >= ?'); params.push(min_prix); }
    if (max_prix) { conditions.push('p.prix <= ?'); params.push(max_prix); }
    if (boutique_id) { conditions.push('p.boutique_id = ?'); params.push(boutique_id); }
    if (import_chine === 'true') conditions.push('p.est_import_chine = TRUE');

    const where = conditions.join(' AND ');

    const total = await queryOne(`SELECT COUNT(*) as n FROM produits p JOIN boutiques b ON b.id = p.boutique_id WHERE ${where}`, params);
    params.push(lim, offset);

    const produits = await query(
      `SELECT p.id, p.nom, p.slug, p.prix, p.prix_promo, p.stock, p.note_moyenne, p.total_avis, p.vues,
              p.est_import_chine, pi.url as image_principale, b.nom as boutique_nom, b.slug as boutique_slug,
              b.est_certifiee, c.nom as categorie_nom
       FROM produits p
       JOIN boutiques b ON b.id = p.boutique_id
       LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
       JOIN categories c ON c.id = p.categorie_id
       WHERE ${where}
       ORDER BY p.total_ventes DESC, p.cree_le DESC
       LIMIT ? OFFSET ?`,
      params
    );

    // Incrémenter vues pour les produits affichés en recherche
    return res.json({ succes: true, produits, total: total.n, page: parseInt(page), limit: lim });
  } catch (err) {
    console.error('[Produits] Lister:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/produits/recherche
const rechercher = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q) return res.json({ succes: true, produits: [], total: 0 });
    const { offset, limit: lim } = paginate(page, limit);

    const produits = await query(
      `SELECT p.id, p.nom, p.slug, p.prix, p.prix_promo, p.note_moyenne, pi.url as image_principale,
              b.nom as boutique_nom, b.est_certifiee,
              MATCH(p.nom, p.description) AGAINST (? IN BOOLEAN MODE) as score
       FROM produits p
       JOIN boutiques b ON b.id = p.boutique_id AND b.statut = 'active'
       LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
       WHERE p.statut = 'publie' AND MATCH(p.nom, p.description) AGAINST (? IN BOOLEAN MODE)
       ORDER BY score DESC LIMIT ? OFFSET ?`,
      [q, q, lim, offset]
    );
    return res.json({ succes: true, produits, query: q });
  } catch (err) {
    console.error('[Produits] Recherche:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/produits/categories
const getCategories = async (_req, res) => {
  const categories = await query('SELECT * FROM categories WHERE est_active = TRUE ORDER BY ordre');
  res.json({ succes: true, categories });
};

// GET /api/produits/categorie/:slug
const parCategorie = async (req, res) => {
  const cat = await queryOne('SELECT * FROM categories WHERE slug = ? AND est_active = TRUE', [req.params.slug]);
  if (!cat) return res.status(404).json({ succes: false, message: 'Catégorie introuvable.' });
  const { page = 1, limit = 20 } = req.query;
  const { offset, limit: lim } = paginate(page, limit);
  const produits = await query(
    `SELECT p.id, p.nom, p.slug, p.prix, p.prix_promo, p.note_moyenne, pi.url as image_principale,
            b.nom as boutique_nom, b.est_certifiee
     FROM produits p
     JOIN boutiques b ON b.id = p.boutique_id AND b.statut = 'active'
     LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
     WHERE p.statut = 'publie' AND p.categorie_id = ?
     ORDER BY p.total_ventes DESC LIMIT ? OFFSET ?`,
    [cat.id, lim, offset]
  );
  res.json({ succes: true, categorie: cat, produits });
};

// GET /api/produits/:slug
const getDetail = async (req, res) => {
  const produit = await queryOne(
    `SELECT p.*, b.nom as boutique_nom, b.slug as boutique_slug, b.est_certifiee, b.note_moyenne as boutique_note,
            b.total_ventes as boutique_ventes, c.nom as categorie_nom, c.slug as categorie_slug
     FROM produits p
     JOIN boutiques b ON b.id = p.boutique_id
     JOIN categories c ON c.id = p.categorie_id
     WHERE p.slug = ? AND p.statut = 'publie'`,
    [req.params.slug]
  );
  if (!produit) return res.status(404).json({ succes: false, message: 'Produit introuvable.' });

  const images = await query('SELECT * FROM produit_images WHERE produit_id = ? ORDER BY ordre', [produit.id]);
  const avis = await query(
    `SELECT a.note, a.commentaire, a.cree_le, u.nom_complet
     FROM avis a JOIN users u ON u.id = a.client_id
     WHERE a.produit_id = ? AND a.est_approuve = TRUE ORDER BY a.cree_le DESC LIMIT 10`,
    [produit.id]
  );

  await query('UPDATE produits SET vues = vues + 1 WHERE id = ?', [produit.id]);

  res.json({ succes: true, produit, images, avis });
};

// GET /api/boutiques/:id — public shop page
const getBoutiquePublique = async (req, res) => {
  try {
    const boutique = await queryOne(
      `SELECT b.id, b.nom, b.slug, b.description, b.ville, b.adresse, b.telephone, b.logo,
              b.est_certifiee, b.note_moyenne, b.total_avis, b.cree_le
       FROM boutiques b WHERE b.id = ? AND b.statut = 'active'`,
      [req.params.id]
    );
    if (!boutique) return res.status(404).json({ succes: false, message: 'Boutique introuvable.' });
    res.json({ succes: true, boutique });
  } catch (e) { res.status(500).json({ succes: false, message: 'Erreur serveur.' }); }
};

// GET /api/boutiques/:id/produits
const getProduitsBoutique = async (req, res) => {
  try {
    const produits = await query(
      `SELECT p.id, p.nom, p.slug, p.prix, p.prix_promo, p.stock, p.note_moyenne, p.total_avis,
              pi.url as image_principale
       FROM produits p
       LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
       WHERE p.boutique_id = ? AND p.statut = 'publie'
       ORDER BY p.cree_le DESC`,
      [req.params.id]
    );
    res.json({ succes: true, produits });
  } catch (e) { res.status(500).json({ succes: false, message: 'Erreur serveur.' }); }
};

module.exports = { lister, rechercher, getCategories, parCategorie, getDetail, getBoutiquePublique, getProduitsBoutique };
