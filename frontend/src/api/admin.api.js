import api from './axios.config';

// Super Admin
export const sa = {
  getDashboard: () => api.get('/superadmin/dashboard'),
  getStats: () => api.get('/superadmin/stats'),
  getAdmins: () => api.get('/superadmin/admins'),
  creerAdmin: (d) => api.post('/superadmin/admins', d),
  updateAdmin: (id, d) => api.put(`/superadmin/admins/${id}`, d),
  supprimerAdmin: (id) => api.delete(`/superadmin/admins/${id}`),
  toggleAdmin: (id) => api.patch(`/superadmin/admins/${id}/toggle`),
  updateProfil: (d) => api.put('/superadmin/profil', d),
  changerMdp: (d) => api.put('/superadmin/mot-de-passe', d),
  getClients: () => api.get('/superadmin/clients'),
  suspendreClient: (id) => api.patch(`/superadmin/clients/${id}/suspendre`),
  getLogs: () => api.get('/superadmin/logs'),
  getConfig: () => api.get('/superadmin/config'),
  updateConfig: (d) => api.put('/superadmin/config', d),
};

// Admin (shared)
export const admin = {
  // Support
  getTickets: () => api.get('/admin/tickets'),
  getLitiges: () => api.get('/admin/litiges'),
  deciderLitige: (id, d) => api.patch(`/admin/litiges/${id}/decision`, d),
  // Finances
  getFinancesDashboard: () => api.get('/admin/finances/dashboard'),
  getRetraits: () => api.get('/admin/retraits'),
  validerRetrait: (id) => api.patch(`/admin/retraits/${id}/valider`),
  // Vendeurs
  getVendeurs: (params) => api.get('/admin/vendeurs', { params }),
  validerBoutique: (id) => api.patch(`/admin/vendeurs/${id}/valider`),
  rejeterBoutique: (id, d) => api.patch(`/admin/vendeurs/${id}/rejeter`, d),
  // Contenu
  getProduits: (params) => api.get('/admin/produits', { params }),
  validerProduit: (id) => api.patch(`/admin/produits/${id}/valider`),
  rejeterProduit: (id, d) => api.patch(`/admin/produits/${id}/rejeter`, d),
  // Logistique
  getCommandes: () => api.get('/admin/commandes'),
  updateStatutCommande: (id, d) => api.patch(`/admin/commandes/${id}/statut`, d),
  getRelais: () => api.get('/admin/relais'),
  addRelais: (d) => api.post('/admin/relais', d),
  toggleRelais: (id) => api.patch(`/admin/relais/${id}/toggle`),
  // Analytics
  getAnalytics: () => api.get('/admin/analytics/dashboard'),
};
