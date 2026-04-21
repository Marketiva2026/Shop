const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();
router.use(auth);

router.get('/profil', ctrl.getProfil);
router.put('/profil', [body('nom_complet').optional().isLength({ min: 2 })], validate, ctrl.updateProfil);
router.put('/mot-de-passe',
  [body('ancien').notEmpty(), body('nouveau').isLength({ min: 8 })],
  validate, ctrl.changerMdp
);

router.get('/adresses', ctrl.getAdresses);
router.post('/adresses',
  [
    body('nom_complet').notEmpty(), body('telephone').notEmpty(),
    body('ligne1').notEmpty(), body('commune').notEmpty(),
  ],
  validate, ctrl.addAdresse
);
router.put('/adresses/:id', ctrl.updateAdresse);
router.delete('/adresses/:id', ctrl.deleteAdresse);
router.patch('/adresses/:id/defaut', ctrl.setAdresseDefaut);

router.get('/notifications', ctrl.getNotifications);
router.patch('/notifications/lire', ctrl.marquerNotificationsLues);

router.get('/favoris', ctrl.getFavoris);
router.post('/favoris/:produit_id', ctrl.addFavori);
router.delete('/favoris/:produit_id', ctrl.removeFavori);

router.get('/wallet', ctrl.getWallet);
router.get('/parrainage', ctrl.getParrainage);

module.exports = router;
