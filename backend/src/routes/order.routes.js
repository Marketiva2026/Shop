const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/order.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();
router.use(auth);

router.get('/relais', ctrl.getRelais);
router.post('/', [body('items').isArray({ min: 1 })], validate, ctrl.creerCommande);
router.get('/', ctrl.mesCommandes);
router.get('/:id', ctrl.getCommande);
router.post('/:id/annuler', ctrl.annulerCommande);
router.post('/:id/confirmer-reception', ctrl.confirmerReception);
router.post('/:id/litige', [body('motif').notEmpty(), body('description').notEmpty()], validate, ctrl.ouvrirLitige);

module.exports = router;
