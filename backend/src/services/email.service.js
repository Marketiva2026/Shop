const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

// ─── Non-blocking wrapper ────────────────────────────────────────────────────

const envoyerEmailAsync = (to, subject, html) => {
  setImmediate(async () => {
    try {
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
    } catch (err) {
      console.error('[Email] Échec silencieux:', err.message);
    }
  });
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

// ─── Shared layout ───────────────────────────────────────────────────────────

const _wrap = (content) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
    <div style="background:#E84822;padding:20px 24px">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">MARKETIVA</h1>
    </div>
    <div style="padding:24px">
      ${content}
    </div>
    <div style="background:#f5f5f5;padding:14px 24px;font-size:12px;color:#888;text-align:center">
      © ${new Date().getFullYear()} MARKETIVA — La marketplace africaine de confiance
    </div>
  </div>
`;

// ─── Templates ───────────────────────────────────────────────────────────────

const templates = {
  bienvenue: (nom) => _wrap(`
    <h2 style="color:#E84822">Bienvenue sur MARKETIVA !</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Votre compte a été créé avec succès. Vous pouvez maintenant explorer nos boutiques et passer vos commandes en toute sécurité.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  commandeCreee: (nom, reference, montant) => _wrap(`
    <h2 style="color:#E84822">Commande reçue</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Votre commande <strong>${reference}</strong> d'un montant de <strong>${Number(montant).toLocaleString('fr-FR')} FCFA</strong> a bien été enregistrée.</p>
    <p>Elle est en attente de paiement. Vous recevrez une confirmation dès que le paiement sera validé.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  commandeConfirmee: (nom, reference, montant) => _wrap(`
    <h2 style="color:#E84822">Commande confirmée</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Votre commande <strong>${reference}</strong> d'un montant de <strong>${Number(montant).toLocaleString('fr-FR')} FCFA</strong> a été reçue.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  paiementConfirme: (nom, reference, montant) => _wrap(`
    <h2 style="color:#27ae60">✅ Paiement confirmé</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Votre paiement de <strong>${Number(montant).toLocaleString('fr-FR')} FCFA</strong> pour la commande <strong>${reference}</strong> a été reçu avec succès.</p>
    <p>Votre commande est maintenant en cours de traitement par le vendeur.</p>
    <p style="color:#666">Merci pour votre confiance !<br>L'équipe MARKETIVA</p>
  `),

  livraisonConfirmee: (nom, reference) => _wrap(`
    <h2 style="color:#27ae60">📦 Livraison confirmée</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Vous avez confirmé la réception de votre commande <strong>${reference}</strong>.</p>
    <p>Le paiement a été transféré au vendeur. Merci d'avoir choisi MARKETIVA !</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  escrowLibere: (nom, reference) => _wrap(`
    <h2 style="color:#27ae60">💰 Paiement reçu sur votre wallet</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>L'escrow de la commande <strong>${reference}</strong> a été libéré. Le montant net (après commission) est désormais disponible sur votre wallet vendeur.</p>
    <p>Vous pouvez demander un retrait depuis votre tableau de bord vendeur.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  litigeOuvert: (nom, reference, motif) => _wrap(`
    <h2 style="color:#e67e22">⚠️ Litige ouvert</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Un litige a été ouvert sur la commande <strong>${reference}</strong>.</p>
    <p><strong>Motif :</strong> ${motif}</p>
    <p>Notre équipe de support va examiner la situation et vous contactera sous 48h. L'escrow est bloqué jusqu'à résolution.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  litigeResolu: (nom, reference, gagnant, resolution) => _wrap(`
    <h2 style="color:#2980b9">⚖️ Litige résolu</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Le litige concernant la commande <strong>${reference}</strong> a été résolu.</p>
    <p><strong>Décision :</strong> ${resolution}</p>
    <p>${gagnant === 'client' ? 'Un remboursement a été initié sur votre compte.' : 'Le paiement a été transféré au vendeur.'}</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  retraitValide: (nom, montant, methode) => _wrap(`
    <h2 style="color:#27ae60">✅ Retrait validé</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Votre retrait de <strong>${Number(montant).toLocaleString('fr-FR')} FCFA</strong> via <strong>${methode}</strong> a été validé et sera traité sous 24h ouvrées.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  retraitRefuse: (nom, montant, raison) => _wrap(`
    <h2 style="color:#e74c3c">❌ Retrait refusé</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Votre demande de retrait de <strong>${Number(montant).toLocaleString('fr-FR')} FCFA</strong> a été refusée.</p>
    <p><strong>Raison :</strong> ${raison}</p>
    <p>Contactez notre support si vous avez des questions.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),

  codeVerification: (nom, code) => _wrap(`
    <h2 style="color:#E84822">Vérifiez votre compte</h2>
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>Voici votre code de vérification MARKETIVA :</p>
    <div style="text-align:center;margin:28px 0">
      <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#E84822;background:#fff3f0;padding:16px 24px;border-radius:8px;border:2px solid #E84822;display:inline-block">
        ${code}
      </span>
    </div>
    <p style="color:#555;font-size:14px">Ce code est valable <strong>10 minutes</strong>. Ne le partagez jamais.</p>
    <p style="color:#888;font-size:12px">Si vous n'avez pas créé de compte sur MARKETIVA, ignorez cet email.</p>
    <p style="color:#666">L'équipe MARKETIVA</p>
  `),
};

module.exports = { envoyerEmail, envoyerEmailAsync, templates };
