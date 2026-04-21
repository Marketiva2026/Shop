const ROLES = {
  CLIENT: 'client',
  VENDEUR: 'vendeur',
  AGENT_RELAIS: 'agent_relais',
  ADMIN_SUPPORT: 'admin_support',
  ADMIN_FINANCES: 'admin_finances',
  ADMIN_VENDEURS: 'admin_vendeurs',
  ADMIN_CONTENU: 'admin_contenu',
  ADMIN_LOGISTIQUE: 'admin_logistique',
  ADMIN_MARKETING: 'admin_marketing',
  SUPER_ADMIN: 'super_admin',
};

const ALL_ADMIN_ROLES = [
  ROLES.ADMIN_SUPPORT,
  ROLES.ADMIN_FINANCES,
  ROLES.ADMIN_VENDEURS,
  ROLES.ADMIN_CONTENU,
  ROLES.ADMIN_LOGISTIQUE,
  ROLES.ADMIN_MARKETING,
  ROLES.SUPER_ADMIN,
];

const OTP_TYPES = {
  INSCRIPTION: 'inscription',
  CONNEXION: 'connexion',
  RESET_PASSWORD: 'reset_password',
};

const COMMANDE_STATUTS = {
  EN_ATTENTE_PAIEMENT: 'en_attente_paiement',
  PAYEE: 'payee',
  EN_PREPARATION: 'en_preparation',
  EXPEDIEE: 'expediee',
  AU_RELAIS: 'au_relais',
  LIVREE: 'livree',
  ANNULEE: 'annulee',
  REMBOURSEE: 'remboursee',
};

const PAIEMENT_STATUTS = {
  EN_ATTENTE: 'en_attente',
  CAPTURE: 'capture',
  LIBERE: 'libere',
  REMBOURSE: 'rembourse',
  ECHEC: 'echec',
};

const BOUTIQUE_STATUTS = {
  EN_ATTENTE: 'en_attente',
  ACTIVE: 'active',
  SUSPENDUE: 'suspendue',
  BANNIE: 'bannie',
};

const PRODUIT_STATUTS = {
  BROUILLON: 'brouillon',
  EN_ATTENTE: 'en_attente',
  PUBLIE: 'publie',
  REJETE: 'rejete',
  ARCHIVE: 'archive',
};

module.exports = {
  ROLES,
  ALL_ADMIN_ROLES,
  OTP_TYPES,
  COMMANDE_STATUTS,
  PAIEMENT_STATUTS,
  BOUTIQUE_STATUTS,
  PRODUIT_STATUTS,
};
