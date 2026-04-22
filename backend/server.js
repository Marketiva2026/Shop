require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { global: globalLimit } = require('./src/middleware/rateLimiter');
const { pool } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Sécurité ──────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [process.env.FRONTEND_URL || 'http://localhost:5173'];
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS non autorisé'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimit);

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./src/routes/auth.routes'));
app.use('/api/user',       require('./src/routes/user.routes'));
app.use('/api/produits',   require('./src/routes/product.routes'));
app.use('/api/vendeur',    require('./src/routes/vendor.routes'));
app.use('/api/commandes',  require('./src/routes/order.routes'));
app.use('/api/paiements',  require('./src/routes/payment.routes'));
app.use('/api/admin',      require('./src/routes/admin.routes'));
app.use('/api/superadmin', require('./src/routes/superadmin.routes'));
app.use('/api/boutiques',  require('./src/routes/boutique.routes'));
app.use('/api/config',     require('./src/routes/config.routes'));

// ─── Santé ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV })
);

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ succes: false, message: 'Route introuvable.' })
);

// ─── Erreur globale ────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ succes: false, message: 'Erreur interne.' });
});

// ─── Démarrage + initialisation Super Admin ────────────────────────────────
async function start() {
  try {
    // Test connexion BDD
    await pool.execute('SELECT 1');
    console.log('✅ Base de données connectée.');

    // Migrations (idempotent — safe on every restart)
    await require('./src/utils/runMigrations').run();

    // Créer le super admin si absent
    const [rows] = await pool.execute("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
    if (!rows.length) {
      const email    = process.env.SUPER_ADMIN_EMAIL    || 'superadmin@marketiva.ci';
      const password = process.env.SUPER_ADMIN_PASSWORD;
      const nom      = process.env.SUPER_ADMIN_NOM      || 'Super';
      const prenom   = process.env.SUPER_ADMIN_PRENOM   || 'Administrateur';
      const tel      = process.env.SUPER_ADMIN_TELEPHONE || '+2250000000000';

      if (!password) {
        console.error('❌ SUPER_ADMIN_PASSWORD manquant dans .env. Serveur arrêté.');
        process.exit(1);
      }

      const hash = await bcrypt.hash(password, 12);
      await pool.execute(
        `INSERT INTO users (nom_complet, email, telephone, mot_de_passe, role, est_verifie, est_actif, code_parrainage)
         VALUES (?, ?, ?, ?, 'super_admin', TRUE, TRUE, 'SUPERADMIN001')`,
        [`${nom} ${prenom}`, email, tel, hash]
      );
      console.log(`✅ Super Admin créé : ${email}`);
    } else {
      console.log('ℹ️  Super Admin existant détecté.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 MARKETIVA Backend · Port ${PORT} · Mode ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Démarrage échoué :', err.message);
    process.exit(1);
  }
}

start();
module.exports = app;
