# CLAUDE.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev       # Start server (node src/server.js), default port 5050
npm run lint      # ESLint
npm run format    # Prettier (all files)
npm run seed      # Seed MySQL via Docker

# Database (local MySQL via Docker)
docker compose up -d --build
docker compose down -v   # Stop and delete data
```

No test framework is configured.

## Architecture

Express.js backend using ES Modules (`"type": "module"`), Firebase Auth, and a dual-database adapter pattern (MySQL or PostgreSQL).

### Database Adapter Pattern

The app supports MySQL (local Docker, default) and PostgreSQL (Supabase) via a provider abstraction:

- `src/config/database.js` — auto-selects client based on `DATABASE_CLIENT` env var or available env vars, exports connection pools
- `src/providers/mysqlProvider.js` / `postgresProvider.js` — raw SQL queries with parameterized placeholders (MySQL uses `?`, Postgres uses `$1`)
- `src/repositories/` — thin adapters that delegate to the correct provider based on `databaseClient`

When adding new queries, implement in **both providers** and expose via the repository.

### Request Flow

Routes → (authMiddleware) → Controllers → Repositories → Providers → DB pool

- Auth middleware verifies Firebase ID tokens from `Authorization: Bearer <token>` header
- Controllers handle request/response logic
- Repositories abstract the database client selection

### Route Mounts

`/auth`, `/dashboard`, `/donations`, `/donors`, `/health`

## Coding Guidelines

### SQL & Database

- Always use parameterized queries — never interpolate user input into SQL strings
- MySQL uses `?` placeholders; Postgres uses `$1, $2, ...` — never mix them up
- When adding a new query, implement it in **both** `mysqlProvider.js` and `postgresProvider.js`, then expose it through the repository. Skipping one provider breaks the other database mode
- Use `pool.execute()` for MySQL and `pgPool.query()` for Postgres — these are the established patterns
- MySQL results destructure as `const [rows] = await pool.execute(...)`, Postgres as `const { rows } = await pgPool.query(...)`
- Be aware of SQL syntax differences: MySQL uses `ON DUPLICATE KEY UPDATE` / `VALUES()`, Postgres uses `ON CONFLICT ... DO UPDATE SET` / `EXCLUDED`
- Column aliasing differs: Postgres requires double quotes for camelCase aliases (`AS "firebaseUid"`), MySQL does not

### Adding New Endpoints

Follow the existing layered pattern — don't put SQL in controllers or route logic in repositories:
1. Add the route in `src/routes/`
2. Add the handler in `src/controllers/`
3. Add the data access in `src/repositories/` (delegating to providers)
4. Register the router in `src/server.js` if it's a new route group

Apply `authMiddleware` to routes that require authentication. Unprotected routes (like `/health`) don't use it.

### Error Handling

- Controllers should wrap async logic in try/catch and return `res.status(500).json({ error: err.message })`
- Return 404 with a descriptive message when a resource is not found
- Don't throw from repositories — let errors propagate naturally to the controller catch block

### General

- This project uses ES Modules (`import`/`export`) — do not use `require()`/`module.exports`
- All file imports must include the `.js` extension (e.g., `import foo from './foo.js'`)
- Export controllers and repositories as object literals with async methods (`const controller = { async method() {} }; export default controller`)
- Prefix unused function parameters with `_` (e.g., `_req`) to satisfy the ESLint `no-unused-vars` rule

## Code Style

- Prettier: single quotes, trailing commas (es5), 2-space indent, 80 char width
- Import order enforced by `@trivago/prettier-plugin-sort-imports`: third-party first, then local
- ESLint: `no-unused-vars` errors except for names starting with uppercase or underscore
