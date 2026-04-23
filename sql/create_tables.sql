-- Supabase / PostgreSQL
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  firstname    VARCHAR(100) DEFAULT NULL,
  lastname     VARCHAR(100) DEFAULT NULL,
  is_approved  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_admin     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT admin_requires_approval CHECK (is_admin = FALSE OR is_approved = TRUE)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS donations (
  id              SERIAL PRIMARY KEY,
  donor_name      VARCHAR(255),
  donor_email     VARCHAR(255),
  amount          DECIMAL(10,2),
  donation_date   DATE,
  receipt_status  VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS donors (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE,
  address         VARCHAR(255),
  phone           VARCHAR(20),
  total_donations DECIMAL(10,2) DEFAULT 0,
  donation_count  INT DEFAULT 0,
  most_recent     DATE
);