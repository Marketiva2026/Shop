const { query, queryOne } = require('../config/database');
const { genReference } = require('../utils/helpers');
const { creer: creerNotif } = require('../services/notification.service');
const { libererEscrow } = require('../services/payment.service');

// ─── SUPPORT ────────────────────────────────────────────
const getTickets = async (req, res) => {
  const tickets = await query(
    `SELECT t.*, u.nom_complet as client_nom FROM tickets_support t
     JOIN users u ON u.id = t.client_id ORDER BY t.cree_le DESC`
  );
  res.json({ succes: true, tickets });
};

const getTicket = async (req, res) => {
  const t = await queryOne('SELECT t.*, u.nom_complet as client_nom FROM tickets_support t JOIN users u ON u.id = t.client_id WHERE t.id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ succes: false });
  res.json({ succes: true, ticket: t });
};

const updateTicketStatut = async (req, res) => {
  await query('UPDATE tickets_support SET statut = ?, agent_id = ? WHERE id = ?', [req.body.statut, req.user.id, req.params.id]);
  res.json({ succes: true });
};

const getLitiges = async (req, res) => {
  const litiges = await query(
    `SELECT l.*, c.nom_complet as client_nom, v.nom_complet as vendeur_nom, cmd.reference as commande_ref
     FROM litiges l
     JOIN users c ON c.id = l.client_id
     JOIN users v ON v.id = l.vendeur_id
     JOIN commandes cmd ON cmd.id = l.commande_id
     ORDER BY l.cree_le DESC`
  );
  res.json({ succes: true, litiges });
};

const deciderLitige = async (req, res) => {
  try {
    // gagnant: 'client' → refund buyer | 'vendeur' → release escrow to seller
    const { gagnant, resolution } = req.body;
    if (!gagnant || !resolution) {
      return res.status(400).json({ succes: false, message: 'gagnant et resolution obligatoires.' });
    }

    const litige = await queryOne(
      `SELECT l.*, cmd.client_id, cmd.reference as commande_ref
       FROM litiges l JOIN commandes cmd ON cmd.id = l.commande_id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!litige) return res.status(404).json({ succes: false, message: 'Litige introuvable.' });

    if (['resolu_client', 'resolu_vendeur'].includes(litige.statut)) {
      return res.status(409).json({ succes: false, message: 'Litige déjà résolu.' });
    }

    if (gagnant === 'client') {
      // ── Décision en faveur du client : rembourser, bloquer le vendeur ────────
      await query(
        `UPDATE paiements SET statut = 'rembourse' WHERE commande_id = ?`,
        [litige.commande_id]
      );
      await query(
        `UPDATE commandes SET statut = 'annulee' WHERE id = ?`,
        [litige.commande_id]
      );
      await query(
        `UPDATE litiges SET statut = 'resolu_client', decision = ?, resolu_le = NOW(), agent_id = ? WHERE id = ?`,
        [resolution, req.user.id, litige.id]
      );

      creerNotif(litige.client_id, '✅ Litige résolu — remboursement', resolution, 'litige').catch(() => {});
      creerNotif(litige.vendeur_id, '⚖️ Litige résolu', `Décision en faveur du client. ${resolution}`, 'litige').catch(() => {});

    } else if (gagnant === 'vendeur') {
      // ── Décision en faveur du vendeur : libérer l'escrow ─────────────────────
      // La résolution du litige (statut → resolu_vendeur) doit se faire AVANT
      // l'appel à libererEscrow, sinon la vérification de litige actif bloquerait
      // la libération.
      await query(
        `UPDATE litiges SET statut = 'resolu_vendeur', decision = ?, resolu_le = NOW(), agent_id = ? WHERE id = ?`,
        [resolution, req.user.id, litige.id]
      );

      const result = await libererEscrow(litige.commande_id);
      if (!result.succes) {
        // Rollback litige update if escrow fails
        await query(
          `UPDATE litiges SET statut = 'en_cours', decision = NULL, resolu_le = NULL, agent_id = NULL WHERE id = ?`,
          [litige.id]
        );
        return res.status(400).json(result);
      }

      creerNotif(litige.vendeur_id, '✅ Litige résolu — paiement libéré', resolution, 'litige').catch(() => {});
      creerNotif(litige.client_id, '⚖️ Litige résolu', `Décision en faveur du vendeur. ${resolution}`, 'litige').catch(() => {});

    } else {
      return res.status(400).json({ succes: false, message: "gagnant doit être 'client' ou 'vendeur'." });
    }

    // Audit log
    await query(
      `INSERT INTO logs_activite (user_id, role, action, cible, details)
       VALUES (?, ?, 'Litige résolu', ?, ?)`,
      [
        req.user.id,
        req.user.role,
        `Litige #${litige.id} — ${litige.commande_ref}`,
        JSON.stringify({ gagnant, resolution }),
      ]
    ).catch(() => {});

    res.json({ succes: true });
  } catch (err) {
    console.error('[Admin] deciderLitige:', err);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// ─── FINANCES ────────────────────────────────────────────
const getFinancesDashboard = async (req, res) => {
  const [revenus, escrow, libere] = await Promise.all([
    queryOne(`SELECT COALESCE(SUM(montant * (SELECT valeur FROM config_systeme WHERE cle='commission_gratuit')/100),0) as total FROM paiements WHERE statut='libere'`),
    queryOne("SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE statut='capture' AND escrow_libere=FALSE"),
    queryOne("SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE escrow_libere=TRUE"),
  ]);
  res.json({ succes: true, revenus_plateforme: revenus.total, escrow_bloque: escrow.total, libere_vendeurs: libere.total });
};

const getTransactions = async (req, res) => {
  const txs = await query('SELECT p.*, c.reference as commande_ref FROM paiements p JOIN commandes c ON c.id = p.commande_id ORDER BY p.cree_le DESC LIMIT 100');
  res.json({ succes: true, transactions: txs });
};

const getRetraits = async (req, res) => {
  const retraits = await query(
    `SELECT r.*, u.nom_complet as vendeur_nom, b.nom as boutique_nom
     FROM retraits_vendeurs r JOIN users u ON u.id = r.vendeur_id JOIN boutiques b ON b.id = r.boutique_id
     WHERE r.statut = 'en_attente' ORDER BY r.cree_le DESC`
  );
  res.json({ succes: true, retraits });
};

const validerRetrait = async (req, res) => {
  await query('UPDATE retraits_vendeurs SET statut = "valide", admin_id = ?, traite_le = NOW() WHERE id = ?', [req.user.id, req.params.id]);
  res.json({ succes: true });
};

const refuserRetrait = async (req, res) => {
  const r = await queryOne('SELECT * FROM retraits_vendeurs WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ succes: false });
  await query('UPDATE retraits_vendeurs SET statut = "refuse", admin_id = ?, note = ?, traite_le = NOW() WHERE id = ?', [req.user.id, req.body.note || '', req.params.id]);
  // Rembourser le wallet
  await query('UPDATE boutiques SET wallet_solde = wallet_solde + ? WHERE id = ?', [r.montant, r.boutique_id]);
  res.json({ succes: true });
};

// ─── VENDEURS ────────────────────────────────────────────
const getVendeurs = async (req, res) => {
  const { statut = 'all' } = req.query;
  const conditions = statut !== 'all' ? 'WHERE b.statut = ?' : '';
  const params = statut !== 'all' ? [statut] : [];
  const boutiques = await query(
    `SELECT b.*, u.nom_complet as vendeur_nom, u.telephone as vendeur_tel
     FROM boutiques b JOIN users u ON u.id = b.vendeur_id ${conditions} ORDER BY b.date_creation DESC`,
    params
  );
  res.json({ succes: true, boutiques });
};

const validerBoutique = async (req, res) => {
  const boutique = await queryOne('SELECT * FROM boutiques WHERE id = ?', [req.params.id]);
  if (!boutique) return res.status(404).json({ succes: false });
  await query('UPDATE boutiques SET statut = "active", date_validation = NOW() WHERE id = ?', [req.params.id]);
  await creerNotif(boutique.vendeur_id, '✅ Boutique validée !', 'Votre boutique est maintenant active.', 'vendeur');
  await query('INSERT INTO logs_activite (user_id, role, action, cible) VALUES (?, ?, ?, ?)', [req.user.id, req.user.role, 'Boutique validée', boutique.nom]);
  res.json({ succes: true });
};

const rejeterBoutique = async (req, res) => {
  const boutique = await queryOne('SELECT * FROM boutiques WHERE id = ?', [req.params.id]);
  if (!boutique) return res.status(404).json({ succes: false });
  await query('UPDATE boutiques SET statut = "bannie", raison_rejet = ? WHERE id = ?', [req.body.raison || '', req.params.id]);
  await creerNotif(boutique.vendeur_id, '❌ Boutique rejetée', `Raison : ${req.body.raison || 'Non conforme'}`, 'vendeur');
  res.json({ succes: true });
};

const suspendreVendeur = async (req, res) => {
  await query('UPDATE boutiques SET statut = "suspendue" WHERE id = ?', [req.params.id]);
  res.json({ succes: true });
};

// ─── CONTENU ────────────────────────────────────────────
const getProduitsAdmin = async (req, res) => {
  const { statut = 'en_attente' } = req.query;
  const produits = await query(
    `SELECT p.*, b.nom as boutique_nom, c.nom as categorie_nom
     FROM produits p JOIN boutiques b ON b.id = p.boutique_id JOIN categories c ON c.id = p.categorie_id
     WHERE p.statut = ? ORDER BY p.cree_le DESC`,
    [statut]
  );
  res.json({ succes: true, produits });
};

const validerProduit = async (req, res) => {
  await query('UPDATE produits SET statut = "publie" WHERE id = ?', [req.params.id]);
  res.json({ succes: true });
};

const rejeterProduit = async (req, res) => {
  await query('UPDATE produits SET statut = "rejete", raison_rejet = ? WHERE id = ?', [req.body.raison || '', req.params.id]);
  res.json({ succes: true });
};

const getAvisAdmin = async (req, res) => {
  const avis = await query(
    `SELECT a.*, p.nom as produit_nom, u.nom_complet as client_nom
     FROM avis a JOIN produits p ON p.id = a.produit_id JOIN users u ON u.id = a.client_id
     WHERE a.est_approuve = FALSE ORDER BY a.cree_le DESC`
  );
  res.json({ succes: true, avis });
};

const approuverAvis = async (req, res) => {
  await query('UPDATE avis SET est_approuve = TRUE WHERE id = ?', [req.params.id]);
  res.json({ succes: true });
};

const supprimerAvis = async (req, res) => {
  await query('DELETE FROM avis WHERE id = ?', [req.params.id]);
  res.json({ succes: true });
};

// ─── LOGISTIQUE ────────────────────────────────────────────
const getCommandesAdmin = async (req, res) => {
  const commandes = await query(
    `SELECT c.*, u.nom_complet as client_nom, u.telephone as client_tel
     FROM commandes c JOIN users u ON u.id = c.client_id
     ORDER BY c.date_commande DESC LIMIT 200`
  );
  res.json({ succes: true, commandes });
};

const updateStatutCommandeAdmin = async (req, res) => {
  const { statut } = req.body;
  await query('UPDATE commandes SET statut = ? WHERE id = ?', [statut, req.params.id]);
  if (statut === 'livree') {
    await libererEscrow(parseInt(req.params.id));
  }
  res.json({ succes: true });
};

const getRelaisAdmin = async (req, res) => {
  const relais = await query('SELECT * FROM points_relais ORDER BY cree_le DESC');
  res.json({ succes: true, relais });
};

const addRelais = async (req, res) => {
  const { nom, adresse, commune, ville, telephone, heures, latitude, longitude } = req.body;
  const r = await query(
    'INSERT INTO points_relais (nom, adresse, commune, ville, telephone, heures, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nom, adresse, commune, ville || 'Abidjan', telephone, heures, latitude || null, longitude || null]
  );
  res.status(201).json({ succes: true, id: r.insertId });
};

const updateRelais = async (req, res) => {
  const { nom, adresse, commune, ville, telephone, heures } = req.body;
  await query('UPDATE points_relais SET nom=?, adresse=?, commune=?, ville=?, telephone=?, heures=? WHERE id=?',
    [nom, adresse, commune, ville, telephone, heures, req.params.id]);
  res.json({ succes: true });
};

const toggleRelais = async (req, res) => {
  await query('UPDATE points_relais SET est_actif = NOT est_actif WHERE id = ?', [req.params.id]);
  res.json({ succes: true });
};

// ─── MARKETING ────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  const [users, boutiques, produits, commandes, revenus] = await Promise.all([
    queryOne('SELECT COUNT(*) as n FROM users WHERE role = "client"'),
    queryOne('SELECT COUNT(*) as n FROM boutiques WHERE statut = "active"'),
    queryOne('SELECT COUNT(*) as n FROM produits WHERE statut = "publie"'),
    queryOne('SELECT COUNT(*) as n FROM commandes WHERE statut NOT IN ("annulee")'),
    queryOne("SELECT COALESCE(SUM(montant_total),0) as total FROM commandes WHERE statut IN ('payee','livree')"),
  ]);
  res.json({
    succes: true,
    stats: {
      clients: users.n,
      vendeurs_actifs: boutiques.n,
      produits_publies: produits.n,
      commandes_total: commandes.n,
      revenus_total: revenus.total,
    },
  });
};

// GET /api/admin/dashboard/moi — KPIs selon le rôle de l'admin connecté
const getDashboardAdmin = async (req, res) => {
  try {
    const role = req.user.role;
    let kpis = {};

    if (role === 'admin_support' || role === 'super_admin') {
      const [tickets, litiges] = await Promise.all([
        queryOne("SELECT COUNT(*) as n FROM tickets_support WHERE statut IN ('ouvert','en_cours')"),
        queryOne("SELECT COUNT(*) as n FROM litiges WHERE statut = 'ouvert'"),
      ]);
      kpis = { tickets_ouverts: tickets.n, litiges_ouverts: litiges.n };
    }
    if (role === 'admin_finances' || role === 'super_admin') {
      const [retraits, escrow] = await Promise.all([
        queryOne("SELECT COUNT(*) as n FROM retraits_vendeurs WHERE statut = 'en_attente'"),
        queryOne("SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE statut = 'capture' AND escrow_libere = FALSE"),
      ]);
      kpis = { ...kpis, retraits_en_attente: retraits.n, escrow_bloque: escrow.total };
    }
    if (role === 'admin_vendeurs' || role === 'super_admin') {
      const boutiques = await queryOne("SELECT COUNT(*) as n FROM boutiques WHERE statut = 'en_attente'");
      kpis = { ...kpis, boutiques_en_attente: boutiques.n };
    }
    if (role === 'admin_contenu' || role === 'super_admin') {
      const [produits, avis] = await Promise.all([
        queryOne("SELECT COUNT(*) as n FROM produits WHERE statut = 'en_attente'"),
        queryOne('SELECT COUNT(*) as n FROM avis WHERE est_approuve = FALSE'),
      ]);
      kpis = { ...kpis, produits_en_attente: produits.n, avis_en_attente: avis.n };
    }
    if (role === 'admin_logistique' || role === 'super_admin') {
      const commandes = await queryOne("SELECT COUNT(*) as n FROM commandes WHERE statut NOT IN ('livree','annulee','remboursee')");
      kpis = { ...kpis, commandes_actives: commandes.n };
    }
    if (role === 'admin_marketing' || role === 'super_admin') {
      const [clients, revenus] = await Promise.all([
        queryOne("SELECT COUNT(*) as n FROM users WHERE role = 'client'"),
        queryOne("SELECT COALESCE(SUM(montant_total),0) as total FROM commandes WHERE statut IN ('payee','livree')"),
      ]);
      kpis = { ...kpis, total_clients: clients.n, revenus_total: revenus.total };
    }

    res.json({ succes: true, role, kpis });
  } catch (err) {
    console.error('[Admin] Dashboard:', err);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

module.exports = {
  getTickets, getTicket, updateTicketStatut, getLitiges, deciderLitige,
  getFinancesDashboard, getTransactions, getRetraits, validerRetrait, refuserRetrait,
  getVendeurs, validerBoutique, rejeterBoutique, suspendreVendeur,
  getProduitsAdmin, validerProduit, rejeterProduit, getAvisAdmin, approuverAvis, supprimerAvis,
  getCommandesAdmin, updateStatutCommandeAdmin, getRelaisAdmin, addRelais, updateRelais, toggleRelais,
  getAnalytics, getDashboardAdmin,
};
