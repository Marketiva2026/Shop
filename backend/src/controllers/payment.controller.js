const { query, queryOne } = require('../config/database');
const { initierPaiement, verifierSignatureWebhook, traiterWebhook, libererEscrow } = require('../services/payment.service');

// POST /api/paiements/initier
const initier = async (req, res) => {
  try {
    const { commande_id, methode } = req.body;
    const commande = await queryOne(
      'SELECT c.* FROM commandes c WHERE c.id = ? AND c.client_id = ? AND c.statut = "en_attente_paiement"',
      [commande_id, req.user.id]
    );
    if (!commande) return res.status(404).json({ succes: false, message: 'Commande introuvable ou déjà payée.' });

    const result = await initierPaiement(commande, methode);
    return res.json({ succes: true, ...result });
  } catch (err) {
    console.error('[Paiement] Initier:', err);
    return res.status(500).json({ succes: false, message: err.message || 'Erreur paiement.' });
  }
};

// GET /api/paiements/statut/:reference
const statut = async (req, res) => {
  const paiement = await queryOne(
    `SELECT p.statut, p.methode, p.montant, p.date_paiement, c.reference as commande_ref
     FROM paiements p JOIN commandes c ON c.id = p.commande_id
     WHERE c.reference = ? AND c.client_id = ?`,
    [req.params.reference, req.user.id]
  );
  if (!paiement) return res.status(404).json({ succes: false });
  res.json({ succes: true, paiement });
};

// POST /api/paiements/webhook/cinetpay (public)
const webhook = async (req, res) => {
  try {
    const sig = req.headers['x-cinetpay-signature'];
    if (sig && !verifierSignatureWebhook(req.body, sig)) {
      return res.status(401).json({ message: 'Signature invalide.' });
    }
    await traiterWebhook(req.body);
    return res.json({ message: 'OK' });
  } catch (err) {
    console.error('[Webhook] CinetPay:', err);
    return res.status(500).json({ message: 'Erreur.' });
  }
};

// POST /api/paiements/cash-relais
const cashRelais = async (req, res) => {
  try {
    const { reference, code_retrait } = req.body;
    const commande = await queryOne(
      'SELECT c.* FROM commandes c WHERE c.reference = ? AND c.code_retrait = ? AND c.statut = "au_relais"',
      [reference, code_retrait]
    );
    if (!commande) return res.status(404).json({ succes: false, message: 'Commande introuvable ou code invalide.' });

    await query('UPDATE paiements SET statut = "capture", date_paiement = NOW() WHERE commande_id = ?', [commande.id]);
    await libererEscrow(commande.id);

    return res.json({ succes: true });
  } catch (err) {
    console.error('[Paiement] Cash relais:', err);
    return res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// POST /api/paiements/demo/confirmer (dev mode only — simulates CinetPay success callback)
const confirmerDemo = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found.' });
  }
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ succes: false, message: 'transaction_id requis.' });

    await traiterWebhook({
      cpm_trans_id: transaction_id,
      cpm_result: '00',
      cpm_amount: '0',
    });
    return res.json({ succes: true });
  } catch (err) {
    console.error('[Demo] ConfirmerDemo:', err);
    return res.status(500).json({ succes: false, message: 'Erreur.' });
  }
};

module.exports = { initier, statut, webhook, cashRelais, confirmerDemo };
