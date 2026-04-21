-- ═══════════════════════════════════════════════════════════════
-- MARKETIVA — Schéma Base de Données MySQL 8
-- ═══════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS logs_activite;
DROP TABLE IF EXISTS retraits_vendeurs;
DROP TABLE IF EXISTS tickets_support;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS favoris;
DROP TABLE IF EXISTS avis;
DROP TABLE IF EXISTS litiges;
DROP TABLE IF EXISTS parrainages;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS paiements;
DROP TABLE IF EXISTS commande_items;
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS points_relais;
DROP TABLE IF EXISTS produit_images;
DROP TABLE IF EXISTS produits;
DROP TABLE IF EXISTS boutiques;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS adresses;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS config_systeme;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS
CREATE TABLE users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nom_complet       VARCHAR(100) NOT NULL,
  email             VARCHAR(150) UNIQUE,
  telephone         VARCHAR(20) UNIQUE NOT NULL,
  mot_de_passe      VARCHAR(255) NOT NULL,
  role              ENUM(
    'client','vendeur','agent_relais',
    'admin_support','admin_finances','admin_vendeurs',
    'admin_contenu','admin_logistique','admin_marketing',
    'super_admin'
  ) DEFAULT 'client',
  est_verifie       BOOLEAN DEFAULT FALSE,
  est_actif         BOOLEAN DEFAULT TRUE,
  photo_profil      VARCHAR(500),
  code_parrainage   VARCHAR(20) UNIQUE,
  parraine_par      INT,
  points_wallet     INT DEFAULT 0,
  adresse           TEXT,
  ville             VARCHAR(100),
  date_inscription  DATETIME DEFAULT CURRENT_TIMESTAMP,
  derniere_connexion DATETIME,
  FOREIGN KEY (parraine_par) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. OTP_CODES
CREATE TABLE otp_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  telephone   VARCHAR(20) NOT NULL,
  code        VARCHAR(255) NOT NULL,
  type        ENUM('inscription','connexion','reset_password'),
  expire_le   DATETIME NOT NULL,
  utilise     BOOLEAN DEFAULT FALSE,
  tentatives  INT DEFAULT 0,
  ip_address  VARCHAR(50),
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_telephone (telephone),
  INDEX idx_expire (expire_le)
);

-- 3. SESSIONS
CREATE TABLE sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  refresh_token VARCHAR(500) NOT NULL UNIQUE,
  appareil      VARCHAR(200),
  ip_address    VARCHAR(50),
  expire_le     DATETIME NOT NULL,
  cree_le       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (refresh_token(100))
);

-- 4. ADRESSES
CREATE TABLE adresses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  label       VARCHAR(50) DEFAULT 'Domicile',
  nom_complet VARCHAR(100) NOT NULL,
  telephone   VARCHAR(20) NOT NULL,
  ligne1      VARCHAR(200) NOT NULL,
  ligne2      VARCHAR(200),
  commune     VARCHAR(100) NOT NULL,
  ville       VARCHAR(100) DEFAULT 'Abidjan',
  est_defaut  BOOLEAN DEFAULT FALSE,
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. CATEGORIES
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  icone       VARCHAR(10),
  description TEXT,
  parent_id   INT,
  est_active  BOOLEAN DEFAULT TRUE,
  ordre       INT DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 6. BOUTIQUES
CREATE TABLE boutiques (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  vendeur_id      INT NOT NULL UNIQUE,
  nom             VARCHAR(150) NOT NULL,
  slug            VARCHAR(150) UNIQUE NOT NULL,
  description     TEXT,
  logo_url        VARCHAR(500),
  banniere_url    VARCHAR(500),
  ville           VARCHAR(100),
  adresse         TEXT,
  telephone       VARCHAR(20),
  email           VARCHAR(150),
  statut          ENUM('en_attente','active','suspendue','bannie') DEFAULT 'en_attente',
  est_certifiee   BOOLEAN DEFAULT FALSE,
  abonnement      ENUM('gratuit','standard','premium') DEFAULT 'gratuit',
  commission_taux DECIMAL(5,2) DEFAULT 10.00,
  note_moyenne    DECIMAL(3,2) DEFAULT 0.00,
  total_ventes    INT DEFAULT 0,
  wallet_solde    DECIMAL(15,2) DEFAULT 0.00,
  date_creation   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendeur_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. PRODUITS
CREATE TABLE produits (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  boutique_id         INT NOT NULL,
  categorie_id        INT NOT NULL,
  nom                 VARCHAR(200) NOT NULL,
  slug                VARCHAR(250) UNIQUE NOT NULL,
  description         TEXT,
  description_courte  VARCHAR(500),
  prix                DECIMAL(15,2) NOT NULL,
  prix_promo          DECIMAL(15,2),
  stock               INT DEFAULT 0,
  statut              ENUM('brouillon','en_attente','publie','rejete','archive') DEFAULT 'en_attente',
  est_import_chine    BOOLEAN DEFAULT FALSE,
  note_moyenne        DECIMAL(3,2) DEFAULT 0.00,
  total_avis          INT DEFAULT 0,
  total_ventes        INT DEFAULT 0,
  vues                INT DEFAULT 0,
  raison_rejet        TEXT,
  cree_le             DATETIME DEFAULT CURRENT_TIMESTAMP,
  modifie_le          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id),
  FULLTEXT INDEX idx_search (nom, description)
);

-- 8. PRODUIT_IMAGES
CREATE TABLE produit_images (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  produit_id      INT NOT NULL,
  url             VARCHAR(500) NOT NULL,
  public_id       VARCHAR(200),
  est_principale  BOOLEAN DEFAULT FALSE,
  ordre           INT DEFAULT 0,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- 9. POINTS_RELAIS
CREATE TABLE points_relais (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(150) NOT NULL,
  agent_id         INT,
  adresse          TEXT NOT NULL,
  commune          VARCHAR(100) NOT NULL,
  ville            VARCHAR(100) DEFAULT 'Abidjan',
  telephone        VARCHAR(20),
  latitude         DECIMAL(10,8),
  longitude        DECIMAL(11,8),
  est_actif        BOOLEAN DEFAULT TRUE,
  heures           VARCHAR(200),
  colis_en_attente INT DEFAULT 0,
  date_creation    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. COMMANDES
CREATE TABLE commandes (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  reference              VARCHAR(30) UNIQUE NOT NULL,
  client_id              INT NOT NULL,
  statut                 ENUM(
    'en_attente_paiement','payee','en_preparation',
    'expediee','au_relais','livree','annulee','remboursee'
  ) DEFAULT 'en_attente_paiement',
  mode_livraison         ENUM('domicile','point_relais') DEFAULT 'point_relais',
  adresse_id             INT,
  relais_id              INT,
  code_retrait           VARCHAR(10),
  montant_produits       DECIMAL(15,2) NOT NULL,
  frais_livraison        DECIMAL(15,2) DEFAULT 0.00,
  reduction_wallet       DECIMAL(15,2) DEFAULT 0.00,
  montant_total          DECIMAL(15,2) NOT NULL,
  notes_client           TEXT,
  date_commande          DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_paiement          DATETIME,
  date_livraison_estimee DATE,
  date_livraison_reelle  DATETIME,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (adresse_id) REFERENCES adresses(id) ON DELETE SET NULL,
  FOREIGN KEY (relais_id) REFERENCES points_relais(id) ON DELETE SET NULL,
  INDEX idx_client (client_id),
  INDEX idx_statut (statut)
);

-- 11. COMMANDE_ITEMS
CREATE TABLE commande_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  commande_id     INT NOT NULL,
  produit_id      INT NOT NULL,
  boutique_id     INT NOT NULL,
  nom_produit     VARCHAR(200) NOT NULL,
  image_url       VARCHAR(500),
  prix_unitaire   DECIMAL(15,2) NOT NULL,
  quantite        INT NOT NULL DEFAULT 1,
  sous_total      DECIMAL(15,2) NOT NULL,
  statut_vendeur  ENUM('en_attente','prepare','expedie') DEFAULT 'en_attente',
  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id),
  FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
);

-- 12. PAIEMENTS
CREATE TABLE paiements (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  commande_id         INT NOT NULL UNIQUE,
  reference_cinetpay  VARCHAR(100) UNIQUE,
  methode             ENUM(
    'mtn_momo','orange_money','moov_money','wave','visa','cash_relais'
  ) NOT NULL,
  montant             DECIMAL(15,2) NOT NULL,
  statut              ENUM('en_attente','capture','libere','rembourse','echec') DEFAULT 'en_attente',
  escrow_libere       BOOLEAN DEFAULT FALSE,
  date_paiement       DATETIME,
  date_liberation     DATETIME,
  metadata            JSON,
  cree_le             DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commande_id) REFERENCES commandes(id)
);

-- 13. WALLET_TRANSACTIONS
CREATE TABLE wallet_transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  type        ENUM(
    'gain_parrainage','gain_cashback','conversion_cash',
    'utilisation_commande','bonus_inscription','remboursement'
  ) NOT NULL,
  points      INT NOT NULL,
  description VARCHAR(300),
  reference   VARCHAR(100),
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. PARRAINAGES
CREATE TABLE parrainages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  parrain_id      INT NOT NULL,
  filleul_id      INT NOT NULL,
  niveau          TINYINT NOT NULL DEFAULT 1,
  points_generes  INT DEFAULT 0,
  cree_le         DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_parrainage (parrain_id, filleul_id),
  FOREIGN KEY (parrain_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (filleul_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. LITIGES
CREATE TABLE litiges (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  reference   VARCHAR(30) UNIQUE NOT NULL,
  commande_id INT NOT NULL,
  client_id   INT NOT NULL,
  vendeur_id  INT NOT NULL,
  agent_id    INT,
  motif       ENUM(
    'non_recu','non_conforme','endommage',
    'description_mensongere','autre'
  ) NOT NULL,
  description TEXT NOT NULL,
  preuves_urls JSON,
  statut      ENUM(
    'ouvert','en_cours','resolu_client',
    'resolu_vendeur','escalade'
  ) DEFAULT 'ouvert',
  decision    TEXT,
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolu_le   DATETIME,
  FOREIGN KEY (commande_id) REFERENCES commandes(id),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (vendeur_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. AVIS
CREATE TABLE avis (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  produit_id  INT NOT NULL,
  client_id   INT NOT NULL,
  commande_id INT NOT NULL,
  note        TINYINT NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  est_approuve BOOLEAN DEFAULT FALSE,
  est_signale  BOOLEAN DEFAULT FALSE,
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_avis (client_id, produit_id, commande_id),
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (commande_id) REFERENCES commandes(id)
);

-- 17. FAVORIS
CREATE TABLE favoris (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  produit_id  INT NOT NULL,
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favori (user_id, produit_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- 18. NOTIFICATIONS
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  titre       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        ENUM(
    'commande','paiement','livraison','litige',
    'parrainage','promo','systeme','vendeur'
  ) NOT NULL,
  est_lue     BOOLEAN DEFAULT FALSE,
  lien        VARCHAR(255),
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_lue (user_id, est_lue)
);

-- 19. TICKETS_SUPPORT
CREATE TABLE tickets_support (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(20) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  agent_id  INT,
  sujet     VARCHAR(200) NOT NULL,
  priorite  ENUM('faible','normal','urgent') DEFAULT 'normal',
  statut    ENUM('ouvert','en_cours','resolu','ferme') DEFAULT 'ouvert',
  cree_le   DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolu_le DATETIME,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 20. RETRAITS_VENDEURS
CREATE TABLE retraits_vendeurs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  vendeur_id  INT NOT NULL,
  boutique_id INT NOT NULL,
  montant     DECIMAL(15,2) NOT NULL,
  methode     ENUM('mtn_momo','orange_money','moov_money','wave','banque'),
  numero      VARCHAR(50) NOT NULL,
  statut      ENUM('en_attente','valide','refuse') DEFAULT 'en_attente',
  admin_id    INT,
  note        TEXT,
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  traite_le   DATETIME,
  FOREIGN KEY (vendeur_id) REFERENCES users(id),
  FOREIGN KEY (boutique_id) REFERENCES boutiques(id),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 21. LOGS_ACTIVITE
CREATE TABLE logs_activite (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  role        VARCHAR(50),
  action      VARCHAR(200) NOT NULL,
  cible       VARCHAR(200),
  ip_address  VARCHAR(50),
  user_agent  VARCHAR(300),
  cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_date (cree_le)
);

-- 22. CONFIG_SYSTEME
CREATE TABLE config_systeme (
  cle         VARCHAR(100) PRIMARY KEY,
  valeur      TEXT NOT NULL,
  type        ENUM('string','number','boolean','json') DEFAULT 'string',
  description VARCHAR(300),
  modifie_le  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Données initiales config
INSERT INTO config_systeme VALUES
  ('commission_gratuit',    '10',    'number',  'Commission plan gratuit (%)',     CURRENT_TIMESTAMP),
  ('commission_standard',   '7',     'number',  'Commission plan standard (%)',    CURRENT_TIMESTAMP),
  ('commission_premium',    '5',     'number',  'Commission plan premium (%)',     CURRENT_TIMESTAMP),
  ('prix_standard_mois',    '5000',  'number',  'Prix abonnement standard (FCFA/mois)', CURRENT_TIMESTAMP),
  ('prix_premium_mois',     '15000', 'number',  'Prix abonnement premium (FCFA/mois)',  CURRENT_TIMESTAMP),
  ('frais_livraison_base',  '1500',  'number',  'Frais livraison de base (FCFA)',  CURRENT_TIMESTAMP),
  ('gain_parrainage_n1',    '2',     'number',  'Gain parrainage niveau 1 (%)',    CURRENT_TIMESTAMP),
  ('gain_parrainage_n2',    '1',     'number',  'Gain parrainage niveau 2 (%)',    CURRENT_TIMESTAMP),
  ('gain_parrainage_n3',    '0.5',   'number',  'Gain parrainage niveau 3 (%)',    CURRENT_TIMESTAMP),
  ('bonus_filleul_pts',     '500',   'number',  'Bonus points à la 1ère commande filleul', CURRENT_TIMESTAMP),
  ('reduction_filleul',     '1000',  'number',  'Réduction filleul 1ère commande (FCFA)',  CURRENT_TIMESTAMP),
  ('min_conversion_pts',    '10000', 'number',  'Minimum points pour convertir en cash',   CURRENT_TIMESTAMP),
  ('otp_actif',             'true',  'boolean', 'OTP SMS obligatoire',             CURRENT_TIMESTAMP),
  ('nouvelles_inscriptions','true',  'boolean', 'Autoriser nouvelles inscriptions', CURRENT_TIMESTAMP);

-- Catégories initiales
INSERT INTO categories (nom, slug, icone, ordre) VALUES
  ('Téléphones & Accessoires', 'telephones',   '📱', 1),
  ('Mode & Tissu',             'mode',         '👗', 2),
  ('Maison & Déco',            'maison',       '🏠', 3),
  ('Beauté & Soins',           'beaute',       '💄', 4),
  ('Informatique',             'informatique', '🖥️', 5),
  ('Sport & Loisirs',          'sport',        '⚽', 6),
  ('Alimentation',             'alimentation', '🍎', 7),
  ('Auto & Moto',              'auto-moto',    '🚗', 8),
  ('Import Chine',             'import-chine', '🇨🇳', 12);
