const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');
const { ROLES } = require('./constants');

const REDIRECT_MAP = {
  super_admin:      'super_admin',
  admin_support:    'admin',
  admin_finances:   'admin',
  admin_vendeurs:   'admin',
  admin_contenu:    'admin',
  admin_logistique: 'admin',
  admin_marketing:  'admin',
  agent_relais:     'admin',
  vendeur:          'vendeur',
  client:           'client',
};

const genTokens = (user, boutique_id = null) => {
  const payload = { id: user.id, role: user.role, boutique_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
  const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRE || '7d',
  });
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

const getBoutiqueId = async (user) => {
  if (user.role !== ROLES.VENDEUR) return null;
  const b = await queryOne('SELECT id FROM boutiques WHERE vendeur_id = ?', [user.id]);
  return b?.id || null;
};

module.exports = { genTokens, saveSession, getBoutiqueId, REDIRECT_MAP };
