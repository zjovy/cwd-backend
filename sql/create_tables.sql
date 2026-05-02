-- Supabase / PostgreSQL
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  firstname    VARCHAR(100) DEFAULT NULL,
  lastname     VARCHAR(100) DEFAULT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('pending', 'member', 'admin'))
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

CREATE TABLE IF NOT EXISTS donors (
  id         SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  address    VARCHAR(255),
  phone      VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donations (
  id             SERIAL PRIMARY KEY,
  donor_id       INT NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  amount         DECIMAL(10,2),
  donation_date  DATE,
  receipt_status VARCHAR(50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);