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
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allowed_users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  status     VARCHAR(10)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'active'))
);

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