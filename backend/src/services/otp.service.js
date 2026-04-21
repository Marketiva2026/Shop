const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query, queryOne } = require('../config/database');
const { sendSMS } = require('../config/twilio');

const OTP_EXPIRE_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SALT_ROUNDS = 10;

const genererOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOTP = async (code) => {
  return bcrypt.hash(code, OTP_SALT_ROUNDS);
};

const verifierOTP = async (code, hash) => {
  return bcrypt.compare(code, hash);
};

const envoyerOTP = async (telephone, type, ip = null) => {
  const expireAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
  const expireStr = expireAt.toISOString().slice(0, 19).replace('T', ' ');

  const code = genererOTP();
  const hashed = await hashOTP(code);

  // Invalider anciens OTP du même type
  await query(
    'UPDATE otp_codes SET utilise = TRUE WHERE telephone = ? AND type = ? AND utilise = FALSE',
    [telephone, type]
  );

  await query(
    'INSERT INTO otp_codes (telephone, code, type, expire_le, ip_address) VALUES (?, ?, ?, ?, ?)',
    [telephone, hashed, type, expireStr, ip]
  );

  const messages = {
    inscription: `MARKETIVA: Votre code de vérification est ${code}. Valable ${OTP_EXPIRE_MINUTES} minutes. Ne le partagez pas.`,
    connexion: `MARKETIVA: Votre code de connexion est ${code}. Valable ${OTP_EXPIRE_MINUTES} minutes.`,
    reset_password: `MARKETIVA: Votre code de réinitialisation est ${code}. Valable ${OTP_EXPIRE_MINUTES} minutes.`,
  };

  await sendSMS(telephone, messages[type] || `MARKETIVA: Votre code est ${code}.`);

  // En dev, retourner le code pour faciliter les tests
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OTP DEV] ${telephone} → ${code}`);
    return { sent: true, otp_demo: code };
  }

  return { sent: true };
};

const validerOTP = async (telephone, codeSaisi, type) => {
  const otpRecord = await queryOne(
    `SELECT * FROM otp_codes
     WHERE telephone = ? AND type = ? AND utilise = FALSE
       AND expire_le > NOW()
     ORDER BY cree_le DESC LIMIT 1`,
    [telephone, type]
  );

  if (!otpRecord) {
    return { valide: false, message: 'Aucun code actif trouvé. Demandez un nouveau code.' };
  }

  if (otpRecord.tentatives >= OTP_MAX_ATTEMPTS) {
    await query('UPDATE otp_codes SET utilise = TRUE WHERE id = ?', [otpRecord.id]);
    return { valide: false, message: 'Trop de tentatives. Demandez un nouveau code.' };
  }

  await query('UPDATE otp_codes SET tentatives = tentatives + 1 WHERE id = ?', [otpRecord.id]);

  const match = await verifierOTP(codeSaisi.trim(), otpRecord.code);
  if (!match) {
    return { valide: false, message: 'Code incorrect.' };
  }

  await query('UPDATE otp_codes SET utilise = TRUE WHERE id = ?', [otpRecord.id]);

  return { valide: true };
};

module.exports = { envoyerOTP, validerOTP, genererOTP };
