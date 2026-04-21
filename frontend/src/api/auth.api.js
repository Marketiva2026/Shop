import api from './axios.config';

export const inscription = (data) => api.post('/auth/inscription', data);
export const verifierOtp = (data) => api.post('/auth/verifier-otp', data);
export const connexion = (data) => api.post('/auth/connexion', data);
export const renvoyerOtp = (data) => api.post('/auth/renvoyer-otp', data);
export const deconnexion = (data) => api.delete('/auth/deconnexion', { data });
export const motDePasseOublie = (data) => api.post('/auth/mot-de-passe-oublie', data);
export const reinitialiserMdp = (data) => api.post('/auth/reinitialiser-mdp', data);
export const getMe = () => api.get('/auth/me');
