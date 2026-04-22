/**
 * Email-based auth controller (additive — does not modify existing phone/OTP flow).
 *
 * New endpoints:
 *   POST /api/auth/inscription-email   — register with email + password
 *   POST /api/auth/verifier-email      — submit 6-digit verification code
 *   POST /api/auth/renvoyer-code-email — resend verification code
 *   POST /api/auth/google              — Google OAuth (ID token from frontend)
 */

const bcrypt          = require('bcrypt');
const { z }           = require('zod');
const { OAuth2Client } = require('google-auth-library');
const { query, queryOne } = require('../config/database');
const { creer: creerNotif } = require('../services/notification.service');
const { envoyerEmailAsync, templates } = require('../services/email.service');
const {
  genererCode, hasherCode, verifierCode, expireAt, CODE_MAX_ATTEMPTS,
} = require('../services/email-auth.service');
const { genCodeParrainage } = require('../utils/helpers');
const { genTokens, saveSession, getBoutiqueId, REDIRECT_MAP } = require('../utils/auth.utils');

const BCRYPT_ROUNDS  = 12;
const googleClient   = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Zod schemas ────────────────────────────────────────────────────────────

const inscriptionSchema = z.object({
  nom_complet:     z.string().trim().min(2).max(100),
  email:           z.string().trim().toLowerCase().email(),
  mot_de_passe:    z.string().min(6, 'Minimum 6 caractères.'),
  code_parrainage: z.string().trim().optional(),
});

const verifierEmailSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code:  z.string().length(6).regex(/^\d+$/, 'Code à 6 chiffres requis.'),
});

const renvoyerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const googleSchema = z.object({
  idToken: z.string().min(10),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseBody = (schema, body, res) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues;
    const errors = issues.map((e) => e.message);
    res.status(400).json({ succes: false, message: errors[0], errors });
    return null;
  }
  return result.data;
};

const buildUserSafe = (user) => {
  const { mot_de_passe, email_code_hash, email_code_expires, email_code_attempts, ...safe } = user;
  return safe;
};

// ─── POST /api/auth/inscription-email ────────────────────────────────────────

const inscriptionEmail = async (req, res) => {
  try {
    const data = parseBody(inscriptionSchema, req.body, res);
    if (!data) return;

    const { nom_complet, email, mot_de_passe, code_parrainage } = data;

    // Duplicate email check
    const existing = await queryOne('SELECT id, provider FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({
        succes: false,
        message: 'Cet email est déjà associé à un compte.',
        action: existing.provider === 'google' ? 'google' : 'login',
      });
    }

    // Resolve referral
    let parrainId = null;
    if (code_parrainage) {
      const parrain = await queryOne(
        'SELECT id FROM users WHERE code_parrainage = ?',
        [code_parrainage.toUpperCase().trim()]
      );
      if (parrain) parrainId = parrain.id;
    }

    const mdpHash  = await bcrypt.hash(mot_de_passe, BCRYPT_ROUNDS);
    const codeRef  = genCodeParrainage(nom_complet);
    const code     = genererCode();
    const codeHash = await hasherCode(code);
    const expires  = expireAt();

    const result = await query(
      `INSERT INTO users
         (nom_complet, email, mot_de_passe, code_parrainage, parraine_par,
          provider, est_verifie, email_code_hash, email_code_expires, email_code_attempts)
       VALUES (?, ?, ?, ?, ?, 'email', FALSE, ?, ?, 0)`,
      [nom_complet.trim(), email, mdpHash, codeRef, parrainId, codeHash, expires]
    );
    const userId = result.insertId;

    // Level-1 referral chain (mirrors inscription phone flow)
    if (parrainId) {
      await query(
        'INSERT INTO parrainages (parrain_id, filleul_id, niveau) VALUES (?, ?, 1)',
        [parrainId, userId]
      );
      const p2 = await queryOne('SELECT parraine_par FROM users WHERE id = ?', [parrainId]);
      if (p2?.parraine_par) {
        await query('INSERT IGNORE INTO parrainages (parrain_id, filleul_id, niveau) VALUES (?, ?, 2)',
          [p2.parraine_par, userId]);
        const p3 = await queryOne('SELECT parraine_par FROM users WHERE id = ?', [p2.parraine_par]);
        if (p3?.parraine_par) {
          await query('INSERT IGNORE INTO parrainages (parrain_id, filleul_id, niveau) VALUES (?, ?, 3)',
            [p3.parraine_par, userId]);
        }
      }
    }

    // Send verification code — async, non-blocking
    envoyerEmailAsync(
      email,
      'Vérifiez votre compte MARKETIVA',
      templates.codeVerification(nom_complet.trim(), code)
    );

    return res.status(201).json({
      succes: true,
      action: 'verify_email',
      email,
      message: 'Compte créé ! Entrez le code de vérification reçu par email.',
      ...(process.env.NODE_ENV !== 'production' && { code_demo: code }),
    });
  } catch (err) {
    console.error('[EmailAuth] Inscription:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// ─── POST /api/auth/verifier-email ───────────────────────────────────────────

const verifierEmail = async (req, res) => {
  try {
    const data = parseBody(verifierEmailSchema, req.body, res);
    if (!data) return;

    const { email, code } = data;

    const user = await queryOne('SELECT * FROM users WHERE email = ? AND provider = ?', [email, 'email']);
    if (!user) {
      return res.status(404).json({ succes: false, message: 'Aucun compte trouvé.' });
    }
    if (user.est_verifie) {
      return res.status(400).json({ succes: false, message: 'Email déjà vérifié. Connectez-vous.' });
    }

    // Expiration check
    if (!user.email_code_expires || new Date(user.email_code_expires) < new Date()) {
      return res.status(400).json({ succes: false, message: 'Code expiré. Demandez un nouveau code.', action: 'resend' });
    }

    // Max attempts
    if (user.email_code_attempts >= CODE_MAX_ATTEMPTS) {
      return res.status(429).json({ succes: false, message: 'Trop de tentatives. Demandez un nouveau code.', action: 'resend' });
    }

    // Increment attempts before comparing (safe against timing exploitation)
    await query(
      'UPDATE users SET email_code_attempts = email_code_attempts + 1 WHERE id = ?',
      [user.id]
    );

    const match = user.email_code_hash
      ? await verifierCode(code, user.email_code_hash)
      : false;

    if (!match) {
      const remaining = CODE_MAX_ATTEMPTS - (user.email_code_attempts + 1);
      return res.status(400).json({
        succes: false,
        message: `Code incorrect. ${remaining > 0 ? `${remaining} tentative(s) restante(s).` : 'Demandez un nouveau code.'}`,
      });
    }

    // Mark verified and clear code fields
    await query(
      `UPDATE users
       SET est_verifie = TRUE, email_code_hash = NULL, email_code_expires = NULL, email_code_attempts = 0
       WHERE id = ?`,
      [user.id]
    );
    user.est_verifie = true;

    await creerNotif(user.id, '🎉 Bienvenue sur MARKETIVA !', `Bonjour ${user.nom_complet} !`, 'systeme');
    await query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const boutiqueId = await getBoutiqueId(user);
    const { token, refreshToken } = genTokens(user, boutiqueId);
    await saveSession(user.id, refreshToken, req);

    return res.json({
      succes: true,
      token,
      refreshToken,
      user: buildUserSafe(user),
      redirect: REDIRECT_MAP[user.role] || 'client',
    });
  } catch (err) {
    console.error('[EmailAuth] Vérifier email:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// ─── POST /api/auth/renvoyer-code-email ──────────────────────────────────────

const renvoyerCodeEmail = async (req, res) => {
  try {
    const data = parseBody(renvoyerSchema, req.body, res);
    if (!data) return;

    const { email } = data;

    const user = await queryOne(
      'SELECT id, nom_complet, est_verifie, provider FROM users WHERE email = ?',
      [email]
    );
    // Generic response to prevent email enumeration
    if (!user || user.est_verifie || user.provider !== 'email') {
      return res.json({ succes: true, message: 'Si ce compte existe et est non vérifié, un nouveau code a été envoyé.' });
    }

    const code     = genererCode();
    const codeHash = await hasherCode(code);
    const expires  = expireAt();

    await query(
      'UPDATE users SET email_code_hash = ?, email_code_expires = ?, email_code_attempts = 0 WHERE id = ?',
      [codeHash, expires, user.id]
    );

    envoyerEmailAsync(
      email,
      'Nouveau code de vérification MARKETIVA',
      templates.codeVerification(user.nom_complet, code)
    );

    return res.json({
      succes: true,
      message: 'Si ce compte existe et est non vérifié, un nouveau code a été envoyé.',
      ...(process.env.NODE_ENV !== 'production' && { code_demo: code }),
    });
  } catch (err) {
    console.error('[EmailAuth] Renvoyer code:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// ─── POST /api/auth/google ────────────────────────────────────────────────────

const connexionGoogle = async (req, res) => {
  try {
    const data = parseBody(googleSchema, req.body, res);
    if (!data) return;

    const { idToken } = data;

    // Verify Google ID token server-side — never trust raw email from frontend
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch {
      return res.status(401).json({ succes: false, message: 'Token Google invalide ou expiré.' });
    }

    const payload  = ticket.getPayload();
    const googleId = payload.sub;
    const email    = payload.email?.toLowerCase();
    const nom      = payload.name || email.split('@')[0];
    const photo    = payload.picture || null;

    if (!email) {
      return res.status(400).json({ succes: false, message: 'Email introuvable dans le token Google.' });
    }

    let user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
      // Account exists — link Google if not yet linked, then login
      if (!user.google_id) {
        await query(
          'UPDATE users SET google_id = ?, provider = IF(provider = \'local\', \'local\', \'google\'), est_verifie = TRUE WHERE id = ?',
          [googleId, user.id]
        );
        user.google_id   = googleId;
        user.est_verifie = true;
      }
    } else {
      // New user via Google — create account (no phone, no password)
      const codeRef  = genCodeParrainage(nom);
      const result   = await query(
        `INSERT INTO users (nom_complet, email, google_id, provider, est_verifie, photo_profil, code_parrainage)
         VALUES (?, ?, ?, 'google', TRUE, ?, ?)`,
        [nom, email, googleId, photo, codeRef]
      );
      user = await queryOne('SELECT * FROM users WHERE id = ?', [result.insertId]);
      await creerNotif(user.id, '🎉 Bienvenue sur MARKETIVA !', `Bonjour ${user.nom_complet} !`, 'systeme');
    }

    if (!user.est_actif) {
      return res.status(403).json({ succes: false, message: 'Compte suspendu. Contactez le support.' });
    }

    await query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const boutiqueId = await getBoutiqueId(user);
    const { token, refreshToken } = genTokens(user, boutiqueId);
    await saveSession(user.id, refreshToken, req);

    return res.json({
      succes: true,
      token,
      refreshToken,
      user: buildUserSafe(user),
      redirect: REDIRECT_MAP[user.role] || 'client',
    });
  } catch (err) {
    console.error('[EmailAuth] Google:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

module.exports = {
  inscriptionEmail,
  verifierEmail,
  renvoyerCodeEmail,
  connexionGoogle,
};
