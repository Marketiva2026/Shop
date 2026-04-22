-- Migration 002: Email verification + Google OAuth support
-- Extends users table — makes telephone/mot_de_passe nullable for OAuth users,
-- adds provider tracking, Google ID, and email verification code columns.

ALTER TABLE users
  MODIFY COLUMN telephone    VARCHAR(20)  NULL,
  MODIFY COLUMN mot_de_passe VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS google_id           VARCHAR(100) UNIQUE        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider            ENUM('local','email','google') DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS email_code_hash     VARCHAR(255)               DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_code_expires  DATETIME                   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_code_attempts TINYINT UNSIGNED           DEFAULT 0
