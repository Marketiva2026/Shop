const bcrypt = require('bcrypt');
const { query, queryOne } = require('../config/database');
const { sanitizeHtml } = require('../utils/helpers');

// GET /api/user/profil
const getProfil = async (req, res) => {
  const user = await queryOne(
    `SELECT id, nom_complet, email, telephone, role, est_verifie, photo_profil,
            code_parrainage, points_wallet, adresse, ville, date_inscription, derniere_connexion
     FROM users WHERE id = ?`,
    [req.user.id]
  );
  res.json({ succes: true, user });
};

// PUT /api/user/profil
const updateProfil = async (req, res) => {
  const { nom_complet, email, adresse, ville } = req.body;
  const fields = [];
  const vals = [];
  if (nom_complet) { fields.push('nom_complet = ?'); vals.push(sanitizeHtml(nom_complet)); }
  if (email) {
    const ex = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), req.user.id]);
    if (ex) return res.status(409).json({ succes: false, message: 'Email déjà utilisé.' });
    fields.push('email = ?'); vals.push(email.toLowerCase());
  }
  if (adresse) { fields.push('adresse = ?'); vals.push(sanitizeHtml(adresse)); }
  if (ville) { fields.push('ville = ?'); vals.push(sanitizeHtml(ville)); }
  if (!fields.length) return res.status(400).json({ succes: false, message: 'Aucun champ à modifier.' });
  vals.push(req.user.id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);
  res.json({ succes: true, message: 'Profil mis à jour.' });
};

// PUT /api/user/mot-de-passe
const changerMdp = async (req, res) => {
  const { ancien, nouveau } = req.body;
  const user = await queryOne('SELECT mot_de_passe FROM users WHERE id = ?', [req.user.id]);
  const ok = await bcrypt.compare(ancien, user.mot_de_passe);
  if (!ok) return res.status(400).json({ succes: false, message: 'Ancien mot de passe incorrect.' });
  const hash = await bcrypt.hash(nouveau, 12);
  await query('UPDATE users SET mot_de_passe = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ succes: true, message: 'Mot de passe mis à jour.' });
};

// GET /api/user/adresses
const getAdresses = async (req, res) => {
  const adresses = await query('SELECT * FROM adresses WHERE user_id = ? ORDER BY est_defaut DESC', [req.user.id]);
  res.json({ succes: true, adresses });
};

// POST /api/user/adresses
const addAdresse = async (req, res) => {
  const { label, nom_complet, telephone, ligne1, ligne2, commune, ville, est_defaut } = req.body;
  if (est_defaut) {
    await query('UPDATE adresses SET est_defaut = FALSE WHERE user_id = ?', [req.user.id]);
  }
  const r = await query(
    'INSERT INTO adresses (user_id, label, nom_complet, telephone, ligne1, ligne2, commune, ville, est_defaut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, label || 'Domicile', nom_complet, telephone, ligne1, ligne2 || null, commune, ville || 'Abidjan', est_defaut ? 1 : 0]
  );
  res.status(201).json({ succes: true, id: r.insertId });
};

// PUT /api/user/adresses/:id
const updateAdresse = async (req, res) => {
  const { label, nom_complet, telephone, ligne1, ligne2, commune, ville, est_defaut } = req.body;
  const ad = await queryOne('SELECT id FROM adresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!ad) return res.status(404).json({ succes: false, message: 'Adresse introuvable.' });
  if (est_defaut) {
    await query('UPDATE adresses SET est_defaut = FALSE WHERE user_id = ?', [req.user.id]);
  }
  await query(
    'UPDATE adresses SET label=?, nom_complet=?, telephone=?, ligne1=?, ligne2=?, commune=?, ville=?, est_defaut=? WHERE id=?',
    [label, nom_complet, telephone, ligne1, ligne2, commune, ville, est_defaut ? 1 : 0, req.params.id]
  );
  res.json({ succes: true });
};

// DELETE /api/user/adresses/:id
const deleteAdresse = async (req, res) => {
  await query('DELETE FROM adresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ succes: true });
};

// PATCH /api/user/adresses/:id/defaut
const setAdresseDefaut = async (req, res) => {
  await query('UPDATE adresses SET est_defaut = FALSE WHERE user_id = ?', [req.user.id]);
  await query('UPDATE adresses SET est_defaut = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ succes: true });
};

// GET /api/user/notifications
const getNotifications = async (req, res) => {
  const notifs = await query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY cree_le DESC LIMIT 50',
    [req.user.id]
  );
  const nonLues = notifs.filter((n) => !n.est_lue).length;
  res.json({ succes: true, notifications: notifs, non_lues: nonLues });
};

// PATCH /api/user/notifications/lire
const marquerNotificationsLues = async (req, res) => {
  await query('UPDATE notifications SET est_lue = TRUE WHERE user_id = ?', [req.user.id]);
  res.json({ succes: true });
};

// GET /api/user/favoris
const getFavoris = async (req, res) => {
  const favoris = await query(
    `SELECT p.*, pi.url as image_principale, b.nom as boutique_nom
     FROM favoris f
     JOIN produits p ON p.id = f.produit_id
     LEFT JOIN produit_images pi ON pi.produit_id = p.id AND pi.est_principale = TRUE
     LEFT JOIN boutiques b ON b.id = p.boutique_id
     WHERE f.user_id = ? ORDER BY f.cree_le DESC`,
    [req.user.id]
  );
  res.json({ succes: true, favoris });
};

// POST /api/user/favoris/:produit_id
const addFavori = async (req, res) => {
  await query('INSERT IGNORE INTO favoris (user_id, produit_id) VALUES (?, ?)', [req.user.id, req.params.produit_id]);
  res.json({ succes: true });
};

// DELETE /api/user/favoris/:produit_id
const removeFavori = async (req, res) => {
  await query('DELETE FROM favoris WHERE user_id = ? AND produit_id = ?', [req.user.id, req.params.produit_id]);
  res.json({ succes: true });
};

// GET /api/user/wallet
const getWallet = async (req, res) => {
  const user = await queryOne('SELECT points_wallet FROM users WHERE id = ?', [req.user.id]);
  const transactions = await query(
    'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY cree_le DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ succes: true, points: user.points_wallet, transactions });
};

// GET /api/user/parrainage
const getParrainage = async (req, res) => {
  const user = await queryOne('SELECT code_parrainage, points_wallet FROM users WHERE id = ?', [req.user.id]);
  const filleuls = await query(
    `SELECT u.nom_complet, u.date_inscription, p.niveau, p.points_generes
     FROM parrainages p JOIN users u ON u.id = p.filleul_id
     WHERE p.parrain_id = ? ORDER BY p.cree_le DESC`,
    [req.user.id]
  );
  res.json({ succes: true, code_parrainage: user.code_parrainage, filleuls, total_points: user.points_wallet });
};

module.exports = {
  getProfil, updateProfil, changerMdp,
  getAdresses, addAdresse, updateAdresse, deleteAdresse, setAdresseDefaut,
  getNotifications, marquerNotificationsLues,
  getFavoris, addFavori, removeFavori,
  getWallet, getParrainage,
};
