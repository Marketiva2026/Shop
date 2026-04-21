const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/payment.controller');
const { auth } = require('../middleware/auth');
const { autoriser } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = Router();

router.post('/webhook/cinetpay', ctrl.webhook);

router.use(auth);
router.post('/initier', [body('commande_id').isInt(), body('methode').notEmpty()], validate, ctrl.initier);
router.get('/statut/:reference', ctrl.statut);
router.post('/cash-relais',
  autoriser('agent_relais', 'super_admin'),
  [body('reference').notEmpty(), body('code_retrait').notEmpty()],
  validate,
  ctrl.cashRelais
);

module.exports = router;
