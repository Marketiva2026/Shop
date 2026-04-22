const rateLimit = require('express-rate-limit');

const global = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { succes: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { succes: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const otp = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.telephone || req.ip,
  message: { succes: false, message: 'Trop de codes OTP demandés. Réessayez dans 1 heure.' },
});

// Per-email rate limiter for email-based auth routes
const emailVerification = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { succes: false, message: 'Trop de tentatives de vérification. Réessayez dans 1 heure.' },
});

module.exports = { global, auth, otp, emailVerification };
