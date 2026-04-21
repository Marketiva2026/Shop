const { query, queryOne, transaction } = require('../config/database');
const { creer: creerNotif } = require('./notification.service');

const crediterPoints = async (userId, points, type, description, reference = null, conn = null) => {
  const exec = conn
    ? (sql, p) => conn.execute(sql, p)
    : (sql, p) => query(sql, p);

  await exec(
    'INSERT INTO wallet_transactions (user_id, type, points, description, reference) VALUES (?, ?, ?, ?, ?)',
    [userId, type, points, description, reference]
  );
  await exec(
    'UPDATE users SET points_wallet = points_wallet + ? WHERE id = ?',
    [points, userId]
  );
};

const debiterPoints = async (userId, points, description, conn = null) => {
  const exec = conn
    ? (sql, p) => conn.execute(sql, p)
    : (sql, p) => query(sql, p);

  const user = await queryOne('SELECT points_wallet FROM users WHERE id = ?', [userId]);
  if (!user || user.points_wallet < points) {
    throw new Error('Solde points insuffisant');
  }
  await exec(
    'INSERT INTO wallet_transactions (user_id, type, points, description) VALUES (?, ?, ?, ?)',
    [userId, 'utilisation_commande', -points, description]
  );
  await exec(
    'UPDATE users SET points_wallet = points_wallet - ? WHERE id = ?',
    [points, userId]
  );
};

const crediterParrainageAchat = async (commande) => {
  try {
    const config = await getConfig();
    const taux = [
      parseFloat(config.gain_parrainage_n1 || 2),
      parseFloat(config.gain_parrainage_n2 || 1),
      parseFloat(config.gain_parrainage_n3 || 0.5),
    ];

    const parrainages = await query(
      'SELECT * FROM parrainages WHERE filleul_id = ? ORDER BY niveau',
      [commande.client_id]
    );

    for (const p of parrainages) {
      const niveau = p.niveau;
      if (niveau > 3) continue;
      const gainPct = taux[niveau - 1];
      const points = Math.floor((commande.montant_total * gainPct) / 100);
      if (points <= 0) continue;

      await crediterPoints(
        p.parrain_id,
        points,
        'gain_parrainage',
        `Parrainage N${niveau} — Commande ${commande.reference}`,
        commande.reference
      );

      await query(
        'UPDATE parrainages SET points_generes = points_generes + ? WHERE id = ?',
        [points, p.id]
      );

      await creerNotif(
        p.parrain_id,
        '🎁 Gain parrainage',
        `Vous avez gagné ${points} points grâce à votre filleul (niveau ${niveau}).`,
        'parrainage'
      );
    }
  } catch (err) {
    console.error('[Wallet] Erreur parrainage:', err.message);
  }
};

const getConfig = async () => {
  const rows = await query('SELECT cle, valeur FROM config_systeme');
  return rows.reduce((acc, r) => ({ ...acc, [r.cle]: r.valeur }), {});
};

module.exports = { crediterPoints, debiterPoints, crediterParrainageAchat };
