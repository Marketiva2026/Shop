const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const envoyerEmail = async (to, subject, html) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL DEMO] To: ${to} | Subject: ${subject}`);
    return;
  }
  const t = getTransporter();
  await t.sendMail({
    from: `"MARKETIVA" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const templates = {
  bienvenue: (nom) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#E84822">Bienvenue sur MARKETIVA !</h2>
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Votre compte a été créé avec succès. Vous pouvez maintenant explorer nos boutiques.</p>
      <p style="color:#666">L'équipe MARKETIVA</p>
    </div>
  `,
  commandeConfirmee: (nom, reference, montant) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#E84822">Commande confirmée</h2>
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Votre commande <strong>${reference}</strong> d'un montant de <strong>${montant} FCFA</strong> a été reçue.</p>
      <p style="color:#666">L'équipe MARKETIVA</p>
    </div>
  `,
};

module.exports = { envoyerEmail, templates };
