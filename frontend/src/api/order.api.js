import api from './axios.config';

export const creerCommande = (data) => api.post('/commandes', data);
export const mesCommandes = () => api.get('/commandes');
export const getCommande = (id) => api.get(`/commandes/${id}`);
export const annulerCommande = (id) => api.post(`/commandes/${id}/annuler`);
export const ouvrirLitige = (id, data) => api.post(`/commandes/${id}/litige`, data);
export const getRelais = () => api.get('/commandes/relais');
export const initierPaiement = (data) => api.post('/paiements/initier', data);
