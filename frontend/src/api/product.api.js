import api from './axios.config';

export const getProduits = (params) => api.get('/produits', { params });
export const rechercher = (q, params) => api.get('/produits/recherche', { params: { q, ...params } });
export const getCategories = () => api.get('/produits/categories');
export const getParCategorie = (slug, params) => api.get(`/produits/categorie/${slug}`, { params });
export const getProduit = (slug) => api.get(`/produits/${slug}`);
