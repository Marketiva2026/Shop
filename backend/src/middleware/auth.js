const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/database');

/**
 * Middleware principal d'authentification.
 * Vérifie le JWT, charge l'utilisateur depuis la BDD (validation côté serveur),
 * et attache req.user.
 */
const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ succes: false, message: 'Token manquant.' });
  }

  const token = header.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ succes: false, message: 'Token expiré.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ succes: false, message: 'Token invalide.' });
  }

  // Validation côté serveur : re-lire l'utilisateur en base à chaque requête protégée
  const user = await queryOne(
    `SELECT id, nom_complet, email, telephone, role, est_actif, est_verifie, photo_profil, points_wallet
     FROM users WHERE id = ?`,
    [payload.id]
  );

  if (!user) {
    return res.status(401).json({ succes: false, message: 'Utilisateur introuvable.' });
  }
  if (!user.est_actif) {
    return res.status(403).json({ succes: false, message: 'Compte suspendu. Contactez le support.' });
  }
  // Vérification de cohérence : le rôle du token doit correspondre à la BDD
  // (protège contre la réutilisation de tokens après changement de rôle)
  if (user.role !== payload.role) {
    return res.status(401).json({ succes: false, message: 'Session invalide. Reconnectez-vous.' });
  }

  req.user = {
    id: user.id,
    nom_complet: user.nom_complet,
    email: user.email,
    telephone: user.telephone,
    role: user.role,
    est_actif: user.est_actif,
    photo_profil: user.photo_profil,
    boutique_id: payload.boutique_id || null,
  };

  next();
};

/**
 * Middleware optionnel : attache l'user si token valide, mais ne bloque pas.
 * Utilisé sur les routes publiques qui personnalisent la réponse si connecté.
 */
const authOptional = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await queryOne(
      'SELECT id, role, est_actif FROM users WHERE id = ? AND est_actif = TRUE',
      [payload.id]
    );
    if (user && user.role === payload.role) req.user = user;
  } catch {
    // Token invalide/expiré sur route optionnelle → on ignore silencieusement
  }
  next();
};

module.exports = { auth, authOptional };
