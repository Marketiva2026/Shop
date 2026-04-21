const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/vendor.controller');
const { auth } = require('../middleware/auth');
const { autoriser } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { upload } = require('../config/cloudinary');

const router = Router();
router.use(auth);
// Vendeurs ET super_admin peuvent gérer les boutiques
const isVendeur = autoriser('vendeur', 'super_admin');

router.post('/boutique', [body('nom').notEmpty()], validate, ctrl.creerBoutique);
router.get('/boutique', isVendeur, ctrl.getMaBoutique);
router.put('/boutique', isVendeur, ctrl.updateBoutique);
router.get('/dashboard', isVendeur, ctrl.getDashboard);

router.post('/produits', isVendeur, [body('nom').notEmpty(), body('prix').isNumeric()], validate, ctrl.creerProduit);
router.get('/produits', isVendeur, ctrl.getMesProduits);
router.put('/produits/:id', isVendeur, ctrl.updateProduit);
router.delete('/produits/:id', isVendeur, ctrl.deleteProduit);
router.post('/produits/:id/images', isVendeur, upload.array('images', 8), ctrl.uploadImages);
router.delete('/produits/:id/images/:img_id', isVendeur, ctrl.deleteImage);

router.get('/commandes', isVendeur, ctrl.getMesCommandes);
router.patch('/commandes/:id/statut', isVendeur, ctrl.updateStatutCommande);

router.get('/wallet', isVendeur, ctrl.getWallet);
router.post('/retraits', isVendeur, [body('montant').isNumeric(), body('methode').notEmpty(), body('numero').notEmpty()], validate, ctrl.demanderRetrait);
router.get('/retraits', isVendeur, ctrl.getWallet);
router.get('/avis', isVendeur, ctrl.getAvis);

module.exports = router;
