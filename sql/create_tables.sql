-- Supabase / PostgreSQL
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  firstname    VARCHAR(100) DEFAULT NULL,
  lastname     VARCHAR(100) DEFAULT NULL,
  is_approved  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_admin     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE allowed_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIEQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_at TIMESTAMP,
  status ENUM('pending', 'invited', 'active') DEFAULT 'pending'
);