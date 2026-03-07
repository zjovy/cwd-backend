# Setup Guide: Firebase Auth + MySQL (Docker) / Supabase (PostgreSQL)

This backend uses **Firebase Authentication** for identity and **MySQL 8.0 via
Docker** for local data persistence (default). It also supports **Supabase
(PostgreSQL)** and can be migrated to **AWS RDS** — see
[Switching to Supabase (PostgreSQL)](#switching-to-supabase-postgresql) and
[Switching to AWS RDS](#switching-to-aws-rds) at the bottom of this guide.

## Architecture

- **Firebase Authentication** — Email/password and Google OAuth sign-in
- **MySQL 8.0 (Docker)** — Local development database (default)
- **Supabase (PostgreSQL)** — Hosted PostgreSQL database (optional)
- **Raw SQL** — Parameterized queries via mysql2 / pg (connection pool)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Set Up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create
   a new project.
2. Click on Project Overview -> "Add app" -> Web app (the </> icon) (name it
   something meaningful)
   - Leave "Firebase Hosting" unchecked for now, we will deal with that later
     when we deploy.
   - Click on "register app"
   - See `firebase-config.js` in `js-frontend` to see where to paste vars.
3. Follow copy/paste steps (paste relevant vars into frontend `.env`)
4. In the left sidebar, go to **Build (dropdown) -> Authentication -> "Get
   Started" -> Sign-in method** and enable:
   - **Email/Password (do not enable passwordless sign-in)**
   - **Google** (optional, for OAuth sign-in)
     - "Public-facing name for project": can be anything, just remember it
     - "Support email for project": Whoever is setting up Firebase
5. Generate a service account key:
   - Go to **Project Settings** (gear icon) → **Service Accounts**
   - Click **Generate New Private Key** (ensure Node is selected) and download
     the JSON file
   - You'll paste the contents of this file into your `.env` in the next step

---

### 3. Set Up Local MySQL (Docker)

1. Make sure **Docker** is installed and running.
2. Start the MySQL container:
   ```bash
   docker compose up -d --build
   ```
   This reads `db_name`, `root_password`, `dev_user`, and `dev_password` from
   your `.env` and starts a MySQL 8.0 container on port 3306.
3. Create the `users` table:
   ```bash
   docker compose exec db mysql -ucwd_dev -plocal_dev_2026 cwd_db < sql/create_tables_mysql.sql
   ```
   Or connect with any MySQL client and run `sql/create_tables_mysql.sql`
   manually.

---

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Paste the entire contents of your Firebase service account JSON (on one line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'

# Database client: mysql (local Docker, default) or postgres (Supabase)
DATABASE_CLIENT=mysql

# Only needed if DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# MySQL connection (used by Docker Compose and the app)
DB_HOST=127.0.0.1
DB_PORT=3306
db_name=cwd_db
root_password=local_root_2026
dev_user=cwd_dev
dev_password=local_dev_2026

# Server config
PORT=5050
FRONTEND_URL=https://your-production-url.com
FRONTEND_URL_DEV=http://localhost:5173
API_URL=http://localhost:5050
NODE_ENV=development
```

---

### 5. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:5050`.

---

## Database Schema

The default `users` table (`sql/create_tables_mysql.sql`):

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid  VARCHAR(128) NOT NULL,
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  firstname     VARCHAR(100) DEFAULT NULL,
  lastname      VARCHAR(100) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY idx_firebase_uid (firebase_uid),
  UNIQUE KEY idx_username     (username),
  UNIQUE KEY idx_email        (email)
);
```

A PostgreSQL version of this schema is available in `sql/create_tables.sql` for
Supabase deployments.

Edit this schema to fit your project's data model.

---

## API Endpoints

### Sign Up

```
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe",
  "firstname": "John",
  "lastname": "Doe"
}
```

**Process:** Creates the user in Firebase Auth, then stores their profile in the
database.

---

### Login

```
POST /auth/login
Content-Type: application/json

{
  "idToken": "firebase-id-token-from-frontend"
}
```

**Frontend example** (using Firebase SDK):

```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken }),
});
```

---

### Google OAuth Token Sync

```
POST /auth/token
Content-Type: application/json

{
  "idToken": "firebase-id-token-from-google-oauth"
}
```

Called automatically by the frontend after Google sign-in to create or confirm
the user's database record.

**Frontend example**:

```javascript
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const idToken = await result.user.getIdToken();

await fetch('/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken }),
});
```

---

### Get Current User

```
GET /auth/me
Authorization: Bearer <firebase-id-token>

# or

GET /auth/profile
Authorization: Bearer <firebase-id-token>
```

---

### Get All Users (Protected)

```
GET /auth/users
Authorization: Bearer <firebase-id-token>
```

---

### Logout

```
POST /auth/logout
```

---

## Project Structure

```
js-backend/
├── sql/
│   ├── create_tables.sql          # Supabase / PostgreSQL schema
│   └── create_tables_mysql.sql    # MySQL schema (local Docker + AWS RDS)
├── src/
│   ├── config/
│   │   ├── firebase.js            # Firebase Admin SDK initialization
│   │   └── database.js            # DB connection pool (auto-selects MySQL or Postgres)
│   ├── controllers/
│   │   └── authController.js      # Auth endpoint logic
│   ├── middleware/
│   │   └── authMiddleware.js      # Firebase token verification
│   ├── providers/
│   │   ├── postgresProvider.js    # Supabase / PostgreSQL queries
│   │   └── mysqlProvider.js       # MySQL queries (local Docker + AWS RDS)
│   ├── repositories/
│   │   └── userRepository.js      # Adapter — auto-selects provider via DATABASE_CLIENT
│   ├── routes/
│   │   └── authRoutes.js          # Express route definitions
│   └── server.js                  # Express app + middleware setup
├── docker-compose.yaml            # Local MySQL 8.0 container
├── init/                          # SQL scripts run on first Docker start
├── .env.example                   # Environment variable template
├── rds-config.ini.example         # AWS RDS config template (for migration)
└── package.json
```

---

## Switching to Supabase (PostgreSQL)

If you need a hosted PostgreSQL database instead of local MySQL:

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project** and fill in a name, database password, and region.
3. Go to **Project Settings → Database → Connect → Connection string (URI)** and
   copy it.
4. In your `.env`, set:
   ```env
   DATABASE_CLIENT=postgres
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Create the `users` table in the Supabase **SQL Editor** using
   `sql/create_tables.sql`.
6. Restart the server — the backend will auto-select the Postgres provider.

---

## Switching to AWS RDS

When your team is ready to migrate to AWS RDS (MySQL), make the following
changes:

### 1. Install the RDS config file

```bash
cp rds-config.ini.example rds-config.ini
```

Fill in your RDS credentials:

```ini
[rds]
endpoint    = your-rds-endpoint.region.rds.amazonaws.com
port_number = 3306
region_name = us-east-2
user_name   = your_username
user_pwd    = your_password
db_name     = your_database_name
```

### 2. Create the MySQL table

Run the MySQL schema against your RDS instance:

```bash
mysql -h <endpoint> -u <user> -p <dbname> < sql/create_tables_mysql.sql
```

Or paste the contents of `sql/create_tables_mysql.sql` into MySQL Workbench.

### 3. Switch the database connection

`src/config/database.js` already supports MySQL. You have two options:

**Option A — Use env-based connection (recommended):** Set these in your `.env`
(the backend will auto-connect via mysql2):

```env
DATABASE_CLIENT=mysql
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=3306
db_name=your_database_name
dev_user=your_username
dev_password=your_password
```

**Option B — Use `rds-config.ini` file:** A commented reference block at the
bottom of `database.js` shows how to read credentials from `rds-config.ini`
using the `ini` package. Uncomment and replace the env-based MySQL block if your
team prefers config-file-based setup.

The repository (`userRepository.js`) auto-selects the MySQL provider when
`DATABASE_CLIENT=mysql`, so no manual provider swapping is required.

---

## Troubleshooting

### MySQL connection refused (local Docker)

- Make sure Docker is running: `docker compose ps`
- Verify the container is up: `docker compose up -d --build`
- Check that `db_name`, `dev_user`, and `dev_password` in `.env` match the
  Docker Compose environment.
- If you changed credentials, recreate the container:
  `docker compose down -v && docker compose up -d --build`

### Supabase / PostgreSQL connection refused

- Make sure `DATABASE_CLIENT=postgres` is set in `.env`.
- Double-check that `DATABASE_URL` matches the URI exactly from Supabase.
- Replace `[YOUR-PASSWORD]` with your actual database password.
- If the password contains special characters, URL-encode them (e.g., `@` →
  `%40`).

### AWS RDS connection refused

- Verify your RDS security group allows inbound traffic on port 3306 from your
  IP.
- Confirm the endpoint and credentials in `rds-config.ini` are correct.
- Make sure the RDS instance is running and publicly accessible (or you're on
  the same VPC).

### Duplicate entry errors

- A unique constraint was violated — email, username, or `firebase_uid` already
  exists in the database.
- PostgreSQL: check for `duplicate key value violates unique constraint`
- MySQL: check for `ER_DUP_ENTRY`

### Firebase errors

- `auth/email-already-exists` — Email is already registered in Firebase.
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env` is valid JSON (the whole JSON
  on one line, wrapped in single quotes).

---

## Notes

- A connection pool is shared across all requests (configured for up to 10
  connections).
- All queries use parameterized placeholders to prevent SQL injection.
- Firebase handles authentication; the database stores user profile data.
- Sensitive config files (`.env`, `*.ini`) are gitignored — never commit them.
