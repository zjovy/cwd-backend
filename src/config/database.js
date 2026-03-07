import dotenv from 'dotenv';
import mysql2 from 'mysql2/promise';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const configuredClient = (process.env.DATABASE_CLIENT || '').toLowerCase();
const hasMysqlEnv = Boolean(
  process.env.db_name && process.env.dev_user && process.env.dev_password
);
const hasPostgresUrl = /^postgres(ql)?:\/\//i.test(rawDatabaseUrl);
const hasPlaceholderPostgresUrl =
  rawDatabaseUrl.includes('[password]') ||
  rawDatabaseUrl.includes('[project-ref]');

const databaseClient =
  configuredClient === 'mysql' || configuredClient === 'postgres'
    ? configuredClient
    : hasMysqlEnv && (!hasPostgresUrl || hasPlaceholderPostgresUrl)
      ? 'mysql'
      : 'postgres';

let pgPool;
let pool;

if (databaseClient === 'postgres') {
  if (!hasPostgresUrl || hasPlaceholderPostgresUrl) {
    throw new Error(
      'Invalid DATABASE_URL. Use a real PostgreSQL URL or set DATABASE_CLIENT=mysql for local Docker MySQL.'
    );
  }

  pgPool = new Pool({
    connectionString: rawDatabaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });
}

if (databaseClient === 'mysql') {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const database = process.env.db_name;
  const user = process.env.dev_user;
  const password = process.env.dev_password;

  if (!database || !user || !password) {
    throw new Error(
      'Missing MySQL env vars. Set db_name, dev_user, and dev_password in .env.'
    );
  }

  pool = mysql2.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

console.log(`[database] Using ${databaseClient}`);

export { databaseClient, pgPool, pool };

// === AWS RDS / MySQL setup reference (keep for migration) ===
// Uncomment this section if/when switching to AWS RDS config-file based setup.
//
// import fs from 'fs';
// import ini from 'ini';
// import mysql2 from 'mysql2/promise';
//
// const CONFIG_FILE = 'rds-config.ini';
// const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
// const config = ini.parse(configData);
//
// const pool = mysql2.createPool({
//   host: config.rds.endpoint,
//   port: parseInt(config.rds.port_number, 10),
//   user: config.rds.user_name,
//   password: config.rds.user_pwd,
//   database: config.rds.db_name,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });
//
// export { pool };
