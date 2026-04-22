-- Migration 001: payment_events table for webhook idempotency
-- Run once against the live database (safe to re-run: uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS payment_events (
  id             INT          AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(150) NOT NULL,
  provider       VARCHAR(50)  NOT NULL DEFAULT 'cinetpay',
  statut         VARCHAR(20)  NOT NULL,
  payload        JSON,
  traite_le      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  -- Unique constraint is the atomic guard: a second INSERT on the same
  -- transaction_id fails at the DB engine level, making double-processing
  -- physically impossible even under concurrent requests.
  UNIQUE KEY uq_payment_event_txid (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
