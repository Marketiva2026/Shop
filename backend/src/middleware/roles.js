const { query } = require('../config/database');

const ADMIN_ROLES = [
  'admin_support','admin_finances','admin_vendeurs',
  'admin_contenu','admin_logistique','admin_marketing',
  'agent_relais',
];

/**
 * Autorise l'accès uniquement aux rôles listés.
 * Usage : autoriser('vendeur', 'super_admin')
 */
const autoriser = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ succes: false, message: 'Non authentifié.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ succes: false, message: 'Accès refusé.' });
  }
  next();
};

/**
 * Réserve la route STRICTEMENT au super_admin.
 * Aucun autre rôle ne passe, même admin_*.
 */
const superAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ succes: false, message: 'Accès réservé au Super Administrateur.' });
  }
  next();
};

/**
 * Bloque l'accès au super_admin sur les routes admin normales.
 * Le super_admin accède à ses données via /api/superadmin, pas /api/admin.
 */
const noSuperAdmin = (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return res.status(403).json({ succes: false, message: 'Utilisez l\'interface Super Admin.' });
  }
  next();
};

/**
 * Vérifie qu'un admin n'accède qu'aux données de son propre rôle.
 * Le super_admin peut tout voir.
 */
const autoriserSection = (section) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ succes: false, message: 'Non authentifié.' });
  if (req.user.role === 'super_admin') return next(); // super_admin passe toujours
  if (req.user.role !== section) {
    return res.status(403).json({ succes: false, message: 'Accès refusé à cette section.' });
  }
  next();
};

/**
 * Journalise automatiquement les actions admin en base.
 * À placer après les middlewares d'auth sur les routes destructrices.
 */
const logAction = (action) => async (req, res, next) => {
  // On laisse passer, puis on log après réponse
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body?.succes !== false && req.user) {
      const cible = req.params?.id ? `ID:${req.params.id}` : '';
      query(
        'INSERT INTO logs_activite (user_id, role, action, cible, ip_address) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, req.user.role, action, cible, req.ip]
      ).catch(() => {});
    }
    return originalJson(body);
  };
  next();
};

module.exports = { autoriser, superAdminOnly, noSuperAdmin, autoriserSection, logAction, ADMIN_ROLES };
