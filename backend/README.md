# Giao Ban Backend API (Express)

## Local dev

```bash
npm install
npm run dev
```

## Production

```bash
npm install --omit=dev
npm run start
```

## Environment variables

- `NODE_ENV=production`
- `JWT_SECRET` (required in production)
- `CORS_ORIGINS` (comma-separated)
- `DB_PATH` (SQLite path; default `./server/giao_ban.db`)
- `SEED_ON_START=false`

## Vercel note

Current code uses `better-sqlite3` (SQLite file). On Vercel Functions, local filesystem is ephemeral, so SQLite is **not persistent**.

If you want persistent DB server on Vercel, migrate backend database layer to a managed DB (e.g. Postgres/Supabase/Neon).
