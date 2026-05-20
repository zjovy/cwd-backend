-- cwd-backend/sql/migrate_anonymous_donations_postgres.sql
-- Postgres also allows multiple NULLs in a UNIQUE constraint.
ALTER TABLE donors
  ALTER COLUMN email DROP NOT NULL;
