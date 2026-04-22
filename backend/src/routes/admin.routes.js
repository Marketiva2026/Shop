const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/admin.controller');
const { auth } = require('../middleware/auth');
const { autoriser, logAction } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = Router();

// Auth obligatoire sur toutes les routes admin
router.use(auth);

// Les super_admin utilisent /api/superadmin — pas cette interface.
// Ici on autorise chaque section uniquement à son admin spécialisé + super_admin.
const SA = 'super_admin';

// ─── Support ────────────────────────────────────────────────────────────────
router.get('/tickets',           autoriser('admin_support', SA), ctrl.getTickets);
router.get('/tickets/:id',       autoriser('admin_support', SA), ctrl.getTicket);
router.patch('/tickets/:id/statut',
  autoriser('admin_support', SA),
  [body('statut').isIn(['en_cours', 'resolu', 'ferme'])], validate,
  logAction('Ticket : changement statut'),
  ctrl.updateTicketStatut
);
router.get('/litiges',           autoriser('admin_support', SA), ctrl.getLitiges);
router.patch('/litiges/:id/decision',
  autoriser('admin_support', SA),
  [
    body('gagnant').isIn(['client', 'vendeur']),
    body('resolution').isString().isLength({ min: 10 }),
  ],
  validate,
  ctrl.deciderLitige
);

// ─── Finances ────────────────────────────────────────────────────────────────
router.get('/finances/dashboard',    autoriser('admin_finances', SA), ctrl.getFinancesDashboard);
router.get('/finances/transactions', autoriser('admin_finances', SA), ctrl.getTransactions);
router.get('/retraits',              autoriser('admin_finances', SA), ctrl.getRetraits);
router.patch('/retraits/:id/valider',
  autoriser('admin_finances', SA),
  logAction('Retrait validé'),
  ctrl.validerRetrait
);
router.patch('/retraits/:id/refuser',
  autoriser('admin_finances', SA),
  logAction('Retrait refusé'),
  ctrl.refuserRetrait
);

// ─── Vendeurs ────────────────────────────────────────────────────────────────
router.get('/vendeurs',              autoriser('admin_vendeurs', SA), ctrl.getVendeurs);
router.patch('/vendeurs/:id/valider',
  autoriser('admin_vendeurs', SA),
  logAction('Boutique validée'),
  ctrl.validerBoutique
);
router.patch('/vendeurs/:id/rejeter',
  autoriser('admin_vendeurs', SA),
  [body('raison').notEmpty()], validate,
  logAction('Boutique rejetée'),
  ctrl.rejeterBoutique
);
router.patch('/vendeurs/:id/suspendre',
  autoriser('admin_vendeurs', SA),
  logAction('Boutique suspendue'),
  ctrl.suspendreVendeur
);

// ─── Contenu ────────────────────────────────────────────────────────────────
router.get('/produits',              autoriser('admin_contenu', SA), ctrl.getProduitsAdmin);
router.patch('/produits/:id/valider',
  autoriser('admin_contenu', SA),
  logAction('Produit validé'),
  ctrl.validerProduit
);
router.patch('/produits/:id/rejeter',
  autoriser('admin_contenu', SA),
  [body('raison').notEmpty()], validate,
  logAction('Produit rejeté'),
  ctrl.rejeterProduit
);
router.get('/avis',                  autoriser('admin_contenu', SA), ctrl.getAvisAdmin);
router.patch('/avis/:id/approuver',  autoriser('admin_contenu', SA), logAction('Avis approuvé'), ctrl.approuverAvis);
router.delete('/avis/:id',           autoriser('admin_contenu', SA), logAction('Avis supprimé'), ctrl.supprimerAvis);

// ─── Logistique ──────────────────────────────────────────────────────────────
router.get('/commandes',             autoriser('admin_logistique', SA), ctrl.getCommandesAdmin);
router.patch('/commandes/:id/statut',
  autoriser('admin_logistique', SA),
  [body('statut').notEmpty()], validate,
  logAction('Commande : statut modifié'),
  ctrl.updateStatutCommandeAdmin
);
router.get('/relais',                autoriser('admin_logistique', SA), ctrl.getRelaisAdmin);
router.post('/relais',
  autoriser('admin_logistique', SA),
  [body('nom').notEmpty(), body('adresse').notEmpty(), body('commune').notEmpty()], validate,
  logAction('Relais ajouté'),
  ctrl.addRelais
);
router.put('/relais/:id',            autoriser('admin_logistique', SA), logAction('Relais modifié'), ctrl.updateRelais);
router.patch('/relais/:id/toggle',   autoriser('admin_logistique', SA), logAction('Relais toggle'), ctrl.toggleRelais);

// ─── Marketing ───────────────────────────────────────────────────────────────
router.get('/analytics/dashboard',   autoriser('admin_marketing', SA), ctrl.getAnalytics);

// ─── Dashboard commun (tous les admins voient leurs propres KPIs) ─────────────
router.get('/dashboard/moi',         auth, ctrl.getDashboardAdmin);

module.exports = router;
