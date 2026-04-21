require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'marketiva_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('📦 Initialisation de la base de données...');

  const schema = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf8');
  const statements = schema.split(';').map((s) => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('SQL Error:', err.message, '\n', stmt.substring(0, 100));
      }
    }
  }

  console.log('✅ Schéma appliqué.');

  // Créer le super admin si absent
  const [rows] = await conn.execute("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
  if (!rows.length) {
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@marketiva.ci';
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const nom = process.env.SUPER_ADMIN_NOM || 'Super';
    const prenom = process.env.SUPER_ADMIN_PRENOM || 'Administrateur';
    const telephone = process.env.SUPER_ADMIN_TELEPHONE || '+2250000000000';

    if (!password) {
      console.error('❌ SUPER_ADMIN_PASSWORD non défini dans .env');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);
    await conn.execute(
      `INSERT INTO users (nom_complet, email, telephone, mot_de_passe, role, est_verifie, est_actif, code_parrainage)
       VALUES (?, ?, ?, ?, 'super_admin', TRUE, TRUE, 'SUPERADMIN')`,
      [`${nom} ${prenom}`, email, telephone, hash]
    );
    console.log(`✅ Super Admin créé : ${email}`);
  } else {
    console.log('ℹ️  Super Admin déjà existant.');
  }

  await conn.end();
  console.log('🚀 Base de données prête.');
}

init().catch((err) => {
  console.error('❌ Erreur init DB:', err);
  process.exit(1);
});
