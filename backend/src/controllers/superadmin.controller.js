const bcrypt = require('bcrypt');
const { query, queryOne } = require('../config/database');
const { sanitizeHtml } = require('../utils/helpers');
const settings = require('../services/settings.service');

const BCRYPT_ROUNDS = 12;

// Rôles qu'un super_admin peut créer — jamais super_admin lui-même
const ADMIN_ROLES_ALLOWED = [
  'admin_support','admin_finances','admin_vendeurs',
  'admin_contenu','admin_logistique','admin_marketing','agent_relais',
];

// GET /api/superadmin/dashboard
const getDashboard = async (req, res) => {
  try {
    const [clients, vendeurs, produits, commandes, litiges, admins, sessions, boutiques_att, prods_att, revenus] = await Promise.all([
      queryOne("SELECT COUNT(*) as n FROM users WHERE role = 'client'"),
      queryOne("SELECT COUNT(*) as n FROM boutiques WHERE statut = 'active'"),
      queryOne("SELECT COUNT(*) as n FROM produits WHERE statut = 'publie'"),
      queryOne('SELECT COUNT(*) as n FROM commandes'),
      queryOne("SELECT COUNT(*) as n FROM litiges WHERE statut = 'ouvert'"),
      // Admins = tous sauf client, vendeur, agent_relais, super_admin
      queryOne("SELECT COUNT(*) as n FROM users WHERE role IN ('admin_support','admin_finances','admin_vendeurs','admin_contenu','admin_logistique','admin_marketing')"),
      queryOne('SELECT COUNT(*) as n FROM sessions WHERE expire_le > NOW()'),
      queryOne("SELECT COUNT(*) as n FROM boutiques WHERE statut = 'en_attente'"),
      queryOne("SELECT COUNT(*) as n FROM produits WHERE statut = 'en_attente'"),
      queryOne("SELECT COALESCE(SUM(montant_total),0) as total FROM commandes WHERE statut IN ('payee','livree')"),
    ]);

    res.json({
      succes: true,
      stats: {
        clients: clients.n,
        vendeurs_actifs: vendeurs.n,
        produits_publies: produits.n,
        commandes_total: commandes.n,
        litiges_ouverts: litiges.n,
        admins: admins.n,
        sessions_actives: sessions.n,
        boutiques_en_attente: boutiques_att.n,
        produits_en_attente: prods_att.n,
        revenus_total: revenus.total,
      },
    });
  } catch (err) {
    console.error('[SA] Dashboard:', err);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/superadmin/stats
const getStats = async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role='client') as clients,
         (SELECT COUNT(*) FROM boutiques WHERE statut='active') as vendeurs_actifs,
         (SELECT COUNT(*) FROM boutiques WHERE statut='en_attente') as boutiques_att,
         (SELECT COUNT(*) FROM produits WHERE statut='publie') as produits,
         (SELECT COUNT(*) FROM produits WHERE statut='en_attente') as produits_att,
         (SELECT COUNT(*) FROM commandes) as commandes,
         (SELECT COALESCE(SUM(montant_total),0) FROM commandes WHERE statut IN ('payee','livree')) as revenus,
         (SELECT COUNT(*) FROM litiges WHERE statut='ouvert') as litiges_ouverts,
         (SELECT COUNT(*) FROM sessions WHERE expire_le > NOW()) as sessions_actives,
         (SELECT COUNT(*) FROM users WHERE role IN ('admin_support','admin_finances','admin_vendeurs','admin_contenu','admin_logistique','admin_marketing')) as admins`
    );
    res.json({ succes: true, stats: rows[0] });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/superadmin/admins — super_admin EXCLU de la liste
const getAdmins = async (req, res) => {
  try {
    const admins = await query(
      `SELECT id, nom_complet, email, telephone, role, est_actif, date_inscription, derniere_connexion
       FROM users
       WHERE role IN ('admin_support','admin_finances','admin_vendeurs','admin_contenu','admin_logistique','admin_marketing','agent_relais')
       ORDER BY date_inscription DESC`
    );
    res.json({ succes: true, admins });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/superadmin/admins
const creerAdmin = async (req, res) => {
  try {
    const { nom_complet, email, telephone, mot_de_passe, role } = req.body;

    // Sécurité : impossible de créer un super_admin via cette route
    if (!ADMIN_ROLES_ALLOWED.includes(role)) {
      return res.status(400).json({ succes: false, message: 'Rôle invalide.' });
    }

    const ex = await queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (ex) return res.status(409).json({ succes: false, message: 'Email déjà utilisé.' });

    const hash = await bcrypt.hash(mot_de_passe, BCRYPT_ROUNDS);
    const codeP = 'ADM' + Date.now().toString(36).toUpperCase();

    const r = await query(
      `INSERT INTO users (nom_complet, email, telephone, mot_de_passe, role, est_verifie, est_actif, code_parrainage)
       VALUES (?, ?, ?, ?, ?, TRUE, TRUE, ?)`,
      [nom_complet.trim(), email.trim().toLowerCase(), telephone?.trim() || null, hash, role, codeP]
    );

    res.status(201).json({ succes: true, id: r.insertId, message: `Admin ${nom_complet} créé (${role}).` });
  } catch (err) {
    console.error('[SA] Créer admin:', err);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// PUT /api/superadmin/admins/:id
const updateAdmin = async (req, res) => {
  try {
    const { nom_complet, telephone, role, est_actif, nouveau_mdp } = req.body;

    // Vérifier que la cible est bien un admin (pas un client, vendeur ou super_admin)
    const admin = await queryOne(
      `SELECT id, role FROM users WHERE id = ?
       AND role IN ('admin_support','admin_finances','admin_vendeurs','admin_contenu','admin_logistique','admin_marketing','agent_relais')`,
      [req.params.id]
    );
    if (!admin) return res.status(404).json({ succes: false, message: 'Admin introuvable.' });

    // Interdire d'élever un admin au rang de super_admin
    if (role && !ADMIN_ROLES_ALLOWED.includes(role)) {
      return res.status(400).json({ succes: false, message: 'Rôle invalide.' });
    }

    const fields = [];
    const vals = [];
    if (nom_complet) { fields.push('nom_complet = ?'); vals.push(sanitizeHtml(nom_complet)); }
    if (telephone)   { fields.push('telephone = ?');   vals.push(telephone); }
    if (role)        { fields.push('role = ?');        vals.push(role); }
    if (est_actif !== undefined) { fields.push('est_actif = ?'); vals.push(est_actif ? 1 : 0); }
    if (nouveau_mdp?.length >= 8) {
      const hash = await bcrypt.hash(nouveau_mdp, BCRYPT_ROUNDS);
      fields.push('mot_de_passe = ?');
      vals.push(hash);
    }

    if (!fields.length) return res.status(400).json({ succes: false, message: 'Aucun champ à modifier.' });
    vals.push(req.params.id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);

    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// DELETE /api/superadmin/admins/:id
const supprimerAdmin = async (req, res) => {
  try {
    const admin = await queryOne(
      `SELECT nom_complet, role FROM users WHERE id = ?
       AND role IN ('admin_support','admin_finances','admin_vendeurs','admin_contenu','admin_logistique','admin_marketing','agent_relais')`,
      [req.params.id]
    );
    if (!admin) return res.status(404).json({ succes: false, message: 'Admin introuvable.' });

    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// PATCH /api/superadmin/admins/:id/toggle
const toggleAdmin = async (req, res) => {
  try {
    const admin = await queryOne(
      `SELECT id, est_actif FROM users WHERE id = ?
       AND role IN ('admin_support','admin_finances','admin_vendeurs','admin_contenu','admin_logistique','admin_marketing','agent_relais')`,
      [req.params.id]
    );
    if (!admin) return res.status(404).json({ succes: false, message: 'Admin introuvable.' });

    await query('UPDATE users SET est_actif = ? WHERE id = ?', [admin.est_actif ? 0 : 1, req.params.id]);
    res.json({ succes: true, est_actif: !admin.est_actif });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/superadmin/profil
const getProfil = async (req, res) => {
  const user = await queryOne(
    'SELECT id, nom_complet, email, telephone, role, date_inscription, derniere_connexion FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json({ succes: true, user });
};

// PUT /api/superadmin/profil
const updateProfil = async (req, res) => {
  try {
    const { nom_complet, email, telephone, adresse } = req.body;
    const fields = [];
    const vals = [];
    if (nom_complet) { fields.push('nom_complet = ?'); vals.push(sanitizeHtml(nom_complet)); }
    if (email) {
      const ex = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), req.user.id]);
      if (ex) return res.status(409).json({ succes: false, message: 'Email déjà utilisé.' });
      fields.push('email = ?'); vals.push(email.toLowerCase());
    }
    if (telephone) { fields.push('telephone = ?'); vals.push(telephone); }
    if (adresse)   { fields.push('adresse = ?');   vals.push(adresse); }

    if (!fields.length) return res.status(400).json({ succes: false, message: 'Aucun champ.' });
    vals.push(req.user.id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);

    const user = await queryOne('SELECT id, nom_complet, email, telephone, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ succes: true, user });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// PUT /api/superadmin/mot-de-passe
const changerMdp = async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;
    const user = await queryOne('SELECT mot_de_passe FROM users WHERE id = ?', [req.user.id]);
    const ok = await bcrypt.compare(ancien, user.mot_de_passe);
    if (!ok) return res.status(400).json({ succes: false, message: 'Ancien mot de passe incorrect.' });
    const hash = await bcrypt.hash(nouveau, BCRYPT_ROUNDS);
    await query('UPDATE users SET mot_de_passe = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/superadmin/clients — exclut tous les rôles admin et super_admin
const getClients = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const clients = await query(
      `SELECT u.id, u.nom_complet, u.email, u.telephone, u.est_actif, u.est_verifie,
              u.date_inscription, u.points_wallet,
              (SELECT COUNT(*) FROM commandes WHERE client_id = u.id) as nb_commandes
       FROM users u
       WHERE u.role IN ('client','vendeur','agent_relais')
       ORDER BY u.date_inscription DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    const total = await queryOne("SELECT COUNT(*) as n FROM users WHERE role IN ('client','vendeur','agent_relais')");
    res.json({ succes: true, clients, total: total.n });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// PATCH /api/superadmin/clients/:id/suspendre
const suspendreClient = async (req, res) => {
  try {
    const user = await queryOne(
      "SELECT id, role FROM users WHERE id = ? AND role IN ('client','vendeur','agent_relais')",
      [req.params.id]
    );
    if (!user) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });
    await query('UPDATE users SET est_actif = FALSE WHERE id = ?', [req.params.id]);
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// PATCH /api/superadmin/clients/:id/activer
const activerClient = async (req, res) => {
  try {
    await query(
      "UPDATE users SET est_actif = TRUE WHERE id = ? AND role IN ('client','vendeur','agent_relais')",
      [req.params.id]
    );
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/superadmin/logs — exclut les logs du super_admin lui-même pour confidentialité
const getLogs = async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const logs = await query(
      `SELECT l.id, l.role, l.action, l.cible, l.ip_address, l.cree_le,
              u.nom_complet as auteur
       FROM logs_activite l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.cree_le DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ succes: true, logs });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/superadmin/config
const getConfig = async (req, res) => {
  try {
    const rows = await query('SELECT * FROM config_systeme ORDER BY cle');
    // Transformer en objet clé→valeur pour facilité frontend
    const config = rows.reduce((acc, r) => {
      acc[r.cle] = { valeur: r.valeur, type: r.type, description: r.description };
      return acc;
    }, {});
    res.json({ succes: true, config, raw: rows });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// PUT /api/superadmin/config
const updateConfig = async (req, res) => {
  try {
    const updates = req.body; // { commission_gratuit: '10', ... }
    for (const [cle, valeur] of Object.entries(updates)) {
      // Vérifier que la clé existe
      const exists = await queryOne('SELECT cle, type FROM config_systeme WHERE cle = ?', [cle]);
      if (!exists) continue;
      await query('UPDATE config_systeme SET valeur = ? WHERE cle = ?', [String(valeur), cle]);
    }
    settings.invalidate();
    res.json({ succes: true, message: 'Configuration mise à jour.' });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

module.exports = {
  getDashboard, getStats,
  getAdmins, creerAdmin, updateAdmin, supprimerAdmin, toggleAdmin,
  getProfil, updateProfil, changerMdp,
  getClients, suspendreClient, activerClient,
  getLogs, getConfig, updateConfig,
};
