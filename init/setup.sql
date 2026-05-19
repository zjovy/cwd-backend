-- This file runs automatically on first `docker compose up` via /docker-entrypoint-initdb.d
-- The database itself is created by MYSQL_DATABASE in docker-compose.yaml

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid  VARCHAR(128) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  firstname     VARCHAR(100) DEFAULT NULL,
  lastname      VARCHAR(100) DEFAULT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY idx_firebase_uid (firebase_uid),
  UNIQUE KEY idx_email        (email),
  CONSTRAINT valid_role CHECK (role IN ('pending', 'member', 'admin'))
);

CREATE TABLE IF NOT EXISTS donors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NULL,
  address    VARCHAR(255),
  phone      VARCHAR(20),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY idx_donor_email (email)
);

CREATE TABLE IF NOT EXISTS donations (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  donor_id       INT NOT NULL,
  amount         DECIMAL(10,2),
  donation_date  DATE,
  receipt_status VARCHAR(50),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_donation_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sync_meta (
  `key`     VARCHAR(64) NOT NULL PRIMARY KEY,
  synced_at DATETIME    NOT NULL
);
