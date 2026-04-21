const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');
const { envoyerOTP, validerOTP } = require('../services/otp.service');
const { creer: creerNotif } = require('../services/notification.service');
const { genCodeParrainage } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');

const BCRYPT_ROUNDS = 12;

const genTokens = (user, boutique_id = null) => {
  const payload = { id: user.id, role: user.role, boutique_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRE || '7d' });
  return { token, refreshToken };
};

const saveSession = async (userId, refreshToken, req) => {
  const expireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expireStr = expireAt.toISOString().slice(0, 19).replace('T', ' ');
  await query(
    'INSERT INTO sessions (user_id, refresh_token, appareil, ip_address, expire_le) VALUES (?, ?, ?, ?, ?)',
    [userId, refreshToken, req.headers['user-agent']?.substring(0, 200), req.ip, expireStr]
  );
};

const REDIRECT_MAP = {
  super_admin: 'super_admin',
  admin_support: 'admin',
  admin_finances: 'admin',
  admin_vendeurs: 'admin',
  admin_contenu: 'admin',
  admin_logistique: 'admin',
  admin_marketing: 'admin',
  agent_relais: 'admin',
  vendeur: 'vendeur',
  client: 'client',
};

// POST /api/auth/inscription
const inscription = async (req, res) => {
  try {
    const { nom_complet, email, telephone, mot_de_passe, code_parrainage } = req.body;

    // Unicité
    const existTel = await queryOne('SELECT id FROM users WHERE telephone = ?', [telephone.trim()]);
    if (existTel) {
      return res.status(409).json({ succes: false, message: 'Ce numéro est déjà associé à un compte.', action: 'login' });
    }

    if (email) {
      const existEmail = await queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      if (existEmail) {
        return res.status(409).json({ succes: false, message: 'Cet email est déjà utilisé.' });
      }
    }

    // Parrain
    let parrainId = null;
    if (code_parrainage) {
      const parrain = await queryOne('SELECT id FROM users WHERE code_parrainage = ?', [code_parrainage.toUpperCase().trim()]);
      if (parrain) parrainId = parrain.id;
    }

    const mdpHash = await bcrypt.hash(mot_de_passe, BCRYPT_ROUNDS);
    const code = genCodeParrainage(nom_complet);

    const result = await query(
      `INSERT INTO users (nom_complet, email, telephone, mot_de_passe, code_parrainage, parraine_par)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom_complet.trim(), email ? email.trim().toLowerCase() : null, telephone.trim(), mdpHash, code, parrainId]
    );
    const userId = result.insertId;

    // Parrainage N1
    if (parrainId) {
      await query(
        'INSERT INTO parrainages (parrain_id, filleul_id, niveau) VALUES (?, ?, 1)',
        [parrainId, userId]
      );
      // Chercher le parrain du parrain pour N2
      const pParrain = await queryOne('SELECT parraine_par FROM users WHERE id = ?', [parrainId]);
      if (pParrain?.parraine_par) {
        await query(
          'INSERT IGNORE INTO parrainages (parrain_id, filleul_id, niveau) VALUES (?, ?, 2)',
          [pParrain.parraine_par, userId]
        );
        // N3
        const ppParrain = await queryOne('SELECT parraine_par FROM users WHERE id = ?', [pParrain.parraine_par]);
        if (ppParrain?.parraine_par) {
          await query(
            'INSERT IGNORE INTO parrainages (parrain_id, filleul_id, niveau) VALUES (?, ?, 3)',
            [ppParrain.parraine_par, userId]
          );
        }
      }
    }

    const otpResult = await envoyerOTP(telephone.trim(), 'inscription', req.ip);

    return res.status(201).json({
      succes: true,
      action: 'otp',
      telephone: telephone.trim(),
      message: 'Compte créé ! Entrez le code OTP reçu par SMS.',
      ...(process.env.NODE_ENV !== 'production' && { otp_demo: otpResult.otp_demo }),
    });
  } catch (err) {
    console.error('[Auth] Inscription:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/auth/verifier-otp
const verifierOtp = async (req, res) => {
  try {
    const { telephone, code, type = 'inscription' } = req.body;

    const resultat = await validerOTP(telephone.trim(), code, type);
    if (!resultat.valide) {
      return res.status(400).json({ succes: false, message: resultat.message });
    }

    const user = await queryOne('SELECT * FROM users WHERE telephone = ?', [telephone.trim()]);
    if (!user) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });

    if (type === 'inscription') {
      await query('UPDATE users SET est_verifie = TRUE WHERE id = ?', [user.id]);
      user.est_verifie = true;

      await creerNotif(user.id, '🎉 Bienvenue sur MARKETIVA !', `Bonjour ${user.nom_complet} !`, 'systeme');
    }

    await query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const boutique = user.role === ROLES.VENDEUR
      ? await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [user.id])
      : null;

    const { token, refreshToken } = genTokens(user, boutique?.id);
    await saveSession(user.id, refreshToken, req);

    const { mot_de_passe: _, ...userSafe } = user;
    return res.json({
      succes: true,
      token,
      refreshToken,
      user: userSafe,
      redirect: REDIRECT_MAP[user.role] || 'client',
    });
  } catch (err) {
    console.error('[Auth] OTP:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/auth/connexion
const connexion = async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    const id = identifiant.trim().toLowerCase();

    const user = await queryOne(
      'SELECT * FROM users WHERE email = ? OR telephone = ?',
      [id, id]
    );

    if (!user) {
      return res.status(404).json({ succes: false, message: 'Aucun compte trouvé avec ces identifiants.', action: 'register' });
    }
    if (!user.est_actif) {
      return res.status(403).json({ succes: false, message: 'Compte suspendu. Contactez le support.' });
    }

    const mdpOk = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!mdpOk) {
      return res.status(401).json({ succes: false, message: 'Mot de passe incorrect.' });
    }

    if (!user.est_verifie) {
      const otpResult = await envoyerOTP(user.telephone, 'connexion', req.ip);
      return res.status(200).json({
        succes: false,
        message: 'Compte non vérifié. Code OTP envoyé.',
        action: 'otp',
        telephone: user.telephone,
        ...(process.env.NODE_ENV !== 'production' && { otp_demo: otpResult.otp_demo }),
      });
    }

    await query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const boutique = user.role === ROLES.VENDEUR
      ? await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [user.id])
      : null;

    const { token, refreshToken } = genTokens(user, boutique?.id);
    await saveSession(user.id, refreshToken, req);

    await query(
      'INSERT INTO logs_activite (user_id, role, action, ip_address) VALUES (?, ?, ?, ?)',
      [user.id, user.role, 'Connexion réussie', req.ip]
    );

    const { mot_de_passe: _, ...userSafe } = user;
    return res.json({
      succes: true,
      token,
      refreshToken,
      user: userSafe,
      redirect: REDIRECT_MAP[user.role] || 'client',
    });
  } catch (err) {
    console.error('[Auth] Connexion:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/auth/renvoyer-otp
const renvoyerOtp = async (req, res) => {
  try {
    const { telephone, type = 'inscription' } = req.body;
    const user = await queryOne('SELECT id FROM users WHERE telephone = ?', [telephone.trim()]);
    if (!user) return res.status(404).json({ succes: false, message: 'Numéro introuvable.' });

    const result = await envoyerOTP(telephone.trim(), type, req.ip);
    return res.json({
      succes: true,
      message: 'Code OTP renvoyé.',
      ...(process.env.NODE_ENV !== 'production' && { otp_demo: result.otp_demo }),
    });
  } catch (err) {
    console.error('[Auth] Renvoyer OTP:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ succes: false, message: 'Refresh token requis.' });

    const session = await queryOne(
      'SELECT * FROM sessions WHERE refresh_token = ? AND expire_le > NOW()',
      [refreshToken]
    );
    if (!session) return res.status(401).json({ succes: false, message: 'Session invalide ou expirée.' });

    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await queryOne('SELECT * FROM users WHERE id = ? AND est_actif = TRUE', [payload.id]);
    if (!user) return res.status(401).json({ succes: false, message: 'Utilisateur introuvable.' });

    // Rotation du refresh token
    const boutique = user.role === ROLES.VENDEUR
      ? await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [user.id])
      : null;

    const { token, refreshToken: newRefresh } = genTokens(user, boutique?.id);

    await query('DELETE FROM sessions WHERE id = ?', [session.id]);
    await saveSession(user.id, newRefresh, req);

    return res.json({ succes: true, token, refreshToken: newRefresh });
  } catch (err) {
    return res.status(401).json({ succes: false, message: 'Token invalide.' });
  }
};

// DELETE /api/auth/deconnexion
const deconnexion = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM sessions WHERE refresh_token = ?', [refreshToken]);
    }
    if (req.user) {
      await query(
        'INSERT INTO logs_activite (user_id, role, action, ip_address) VALUES (?, ?, ?, ?)',
        [req.user.id, req.user.role, 'Déconnexion', req.ip]
      );
    }
    return res.json({ succes: true, message: 'Déconnecté.' });
  } catch (err) {
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/auth/mot-de-passe-oublie
const motDePasseOublie = async (req, res) => {
  try {
    const { telephone } = req.body;
    const user = await queryOne('SELECT id FROM users WHERE telephone = ?', [telephone.trim()]);
    // Réponse générique pour éviter l'énumération
    if (!user) return res.json({ succes: true, message: 'Si ce numéro existe, un code sera envoyé.' });

    const result = await envoyerOTP(telephone.trim(), 'reset_password', req.ip);
    return res.json({
      succes: true,
      message: 'Code OTP envoyé.',
      ...(process.env.NODE_ENV !== 'production' && { otp_demo: result.otp_demo }),
    });
  } catch (err) {
    console.error('[Auth] MDP oublié:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/auth/reinitialiser-mdp
const reinitialiserMdp = async (req, res) => {
  try {
    const { telephone, code, nouveau_mot_de_passe } = req.body;

    const resultat = await validerOTP(telephone.trim(), code, 'reset_password');
    if (!resultat.valide) return res.status(400).json({ succes: false, message: resultat.message });

    const hash = await bcrypt.hash(nouveau_mot_de_passe, BCRYPT_ROUNDS);
    await query('UPDATE users SET mot_de_passe = ? WHERE telephone = ?', [hash, telephone.trim()]);

    return res.json({ succes: true, message: 'Mot de passe mis à jour. Connectez-vous.' });
  } catch (err) {
    console.error('[Auth] Reset MDP:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, nom_complet, email, telephone, role, est_verifie, photo_profil, code_parrainage, points_wallet, date_inscription FROM users WHERE id = ?',
      [req.user.id]
    );
    return res.json({ succes: true, user });
  } catch (err) {
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

module.exports = {
  inscription,
  verifierOtp,
  connexion,
  renvoyerOtp,
  refresh,
  deconnexion,
  motDePasseOublie,
  reinitialiserMdp,
  me,
};
