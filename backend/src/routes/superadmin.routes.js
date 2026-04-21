const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/superadmin.controller');
const { auth } = require('../middleware/auth');
const { superAdminOnly, logAction } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = Router();

// Double garde : auth JWT + superAdminOnly (rôle vérifié en BDD dans auth)
router.use(auth, superAdminOnly);

router.get('/dashboard',   ctrl.getDashboard);
router.get('/stats',       ctrl.getStats);

// Gestion des admins — super_admin jamais dans cette liste
router.get('/admins',    ctrl.getAdmins);
router.post('/admins',
  [
    body('nom_complet').trim().notEmpty().withMessage('Nom requis.'),
    body('email').isEmail().normalizeEmail(),
    body('mot_de_passe').isLength({ min: 8 }).withMessage('Minimum 8 caractères.'),
    body('role').isIn([
      'admin_support','admin_finances','admin_vendeurs',
      'admin_contenu','admin_logistique','admin_marketing','agent_relais',
    ]).withMessage('Rôle invalide.'),
  ],
  validate,
  logAction('Création admin'),
  ctrl.creerAdmin
);
router.put('/admins/:id',     logAction('Modification admin'), ctrl.updateAdmin);
router.delete('/admins/:id',  logAction('Suppression admin'), ctrl.supprimerAdmin);
router.patch('/admins/:id/toggle', logAction('Toggle admin'), ctrl.toggleAdmin);

// Profil du super_admin lui-même
router.get('/profil',         ctrl.getProfil);
router.put('/profil',         logAction('Super admin : profil modifié'), ctrl.updateProfil);
router.put('/mot-de-passe',
  [body('ancien').notEmpty(), body('nouveau').isLength({ min: 8 })],
  validate,
  ctrl.changerMdp
);

// Clients
router.get('/clients',                              ctrl.getClients);
router.patch('/clients/:id/suspendre',  logAction('Client suspendu'),  ctrl.suspendreClient);
router.patch('/clients/:id/activer',    logAction('Client réactivé'),  ctrl.activerClient);

// Logs
router.get('/logs',    ctrl.getLogs);

// Configuration système
router.get('/config',  ctrl.getConfig);
router.put('/config',  logAction('Config système modifiée'), ctrl.updateConfig);

module.exports = router;
