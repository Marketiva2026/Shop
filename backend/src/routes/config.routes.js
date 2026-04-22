const { Router } = require('express');
const settings = require('../services/settings.service');

const router = Router();

// GET /api/config/public — exposes non-sensitive platform settings to the frontend
router.get('/public', async (_req, res) => {
  try {
    const all = await settings.getAll();
    const PUBLIC_KEYS = [
      'frais_livraison_base',
      'commission_gratuit',
      'reduction_filleul',
      'gain_parrainage_n1',
      'gain_parrainage_n2',
      'gain_parrainage_n3',
    ];
    const pub = {};
    for (const k of PUBLIC_KEYS) {
      if (k in all) pub[k] = all[k];
    }
    res.json({ succes: true, config: pub });
  } catch (err) {
    console.error('[Config] Public endpoint:', err);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
});

module.exports = router;
