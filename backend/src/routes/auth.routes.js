const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const limiter = require('../middleware/rateLimiter');

const router = Router();

router.post('/inscription',
  limiter.auth,
  [
    body('nom_complet').trim().notEmpty().withMessage('Le nom complet est requis.').isLength({ min: 2, max: 100 }),
    body('telephone').trim().notEmpty().withMessage('Le téléphone est requis.').matches(/^\+?[0-9]{8,15}$/),
    body('mot_de_passe').isLength({ min: 8 }).withMessage('Minimum 8 caractères.'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  ],
  validate,
  ctrl.inscription
);

router.post('/verifier-otp',
  limiter.auth,
  [
    body('telephone').trim().notEmpty(),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric(),
    body('type').optional().isIn(['inscription', 'connexion', 'reset_password']),
  ],
  validate,
  ctrl.verifierOtp
);

router.post('/connexion',
  limiter.auth,
  [
    body('identifiant').trim().notEmpty().withMessage('Identifiant requis.'),
    body('mot_de_passe').notEmpty().withMessage('Mot de passe requis.'),
  ],
  validate,
  ctrl.connexion
);

router.post('/renvoyer-otp',
  limiter.otp,
  [
    body('telephone').trim().notEmpty(),
    body('type').optional().isIn(['inscription', 'connexion', 'reset_password']),
  ],
  validate,
  ctrl.renvoyerOtp
);

router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  ctrl.refresh
);

router.delete('/deconnexion', auth, ctrl.deconnexion);

router.post('/mot-de-passe-oublie',
  limiter.auth,
  [body('telephone').trim().notEmpty()],
  validate,
  ctrl.motDePasseOublie
);

router.post('/reinitialiser-mdp',
  [
    body('telephone').trim().notEmpty(),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric(),
    body('nouveau_mot_de_passe').isLength({ min: 8 }),
  ],
  validate,
  ctrl.reinitialiserMdp
);

router.get('/me', auth, ctrl.me);

module.exports = router;
