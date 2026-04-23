-- AWS RDS / MySQL
-- Run this after connecting to your RDS instance

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid  VARCHAR(128) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  firstname     VARCHAR(100) DEFAULT NULL,
  lastname      VARCHAR(100) DEFAULT NULL,
  is_approved   BOOLEAN      NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY idx_firebase_uid (firebase_uid),
  UNIQUE KEY idx_email        (email),
  CONSTRAINT admin_requires_approval CHECK (is_admin = FALSE OR is_approved = TRUE)
);

CREATE TABLE IF NOT EXISTS donations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  donor_name      VARCHAR(255),
  donor_email     VARCHAR(255),
  amount          DECIMAL(10,2),
  donation_date   DATE,
  receipt_status  VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS donors (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE,
  address         VARCHAR(255),
  phone           VARCHAR(20),
  total_donations DECIMAL(10,2) DEFAULT 0,
  donation_count  INT DEFAULT 0,
  most_recent     DATE
);
