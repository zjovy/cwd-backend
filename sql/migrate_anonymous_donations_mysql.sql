-- cwd-backend/sql/migrate_anonymous_donations_mysql.sql
-- MySQL allows multiple NULLs in a UNIQUE index, so the unique constraint stays.
ALTER TABLE donors
  MODIFY COLUMN email VARCHAR(255) NULL;
