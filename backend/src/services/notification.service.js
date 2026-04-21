const { query } = require('../config/database');
const { sendSMS } = require('../config/twilio');
const { envoyerEmail } = require('./email.service');

const creer = async (userId, titre, message, type, lien = null) => {
  await query(
    'INSERT INTO notifications (user_id, titre, message, type, lien) VALUES (?, ?, ?, ?, ?)',
    [userId, titre, message, type, lien]
  );
};

const marquerLues = async (userId) => {
  await query('UPDATE notifications SET est_lue = TRUE WHERE user_id = ?', [userId]);
};

module.exports = { creer, marquerLues, sendSMS, envoyerEmail };
