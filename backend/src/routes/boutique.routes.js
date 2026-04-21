const { Router } = require('express');
const ctrl = require('../controllers/product.controller');

const router = Router();

router.get('/:id', ctrl.getBoutiquePublique);
router.get('/:id/produits', ctrl.getProduitsBoutique);

module.exports = router;
