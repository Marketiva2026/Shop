/**
 * Email-based verification code service.
 * Mirrors otp.service.js pattern but sends via email instead of SMS.
 * Codes are bcrypt-hashed before storage — never saved in plaintext.
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');

const CODE_EXPIRE_MINUTES = 10;
const CODE_MAX_ATTEMPTS   = 5;
const CODE_SALT_ROUNDS    = 10;

const genererCode = () => crypto.randomInt(100000, 999999).toString();

const hasherCode = (code) => bcrypt.hash(code, CODE_SALT_ROUNDS);

const verifierCode = (code, hash) => bcrypt.compare(code, hash);

const expireAt = () => {
  const d = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

module.exports = {
  genererCode,
  hasherCode,
  verifierCode,
  expireAt,
  CODE_EXPIRE_MINUTES,
  CODE_MAX_ATTEMPTS,
};
