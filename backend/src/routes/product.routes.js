const { Router } = require('express');
const ctrl = require('../controllers/product.controller');

const router = Router();

router.get('/', ctrl.lister);
router.get('/categories', ctrl.getCategories);
router.get('/recherche', ctrl.rechercher);
router.get('/categorie/:slug', ctrl.parCategorie);
router.get('/:slug', ctrl.getDetail);

module.exports = router;
