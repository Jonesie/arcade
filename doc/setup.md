# Local development setup

## Prerequisites

- Node 24 (`nvm use` picks it up from `.nvmrc`)
- A reachable SQL Server instance (a local container works fine — see below
  for a quick one-off if you don't already have one)

## First-time setup

```bash
cp .env.example .env
```

Fill in `.env`:

- `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — your SQL
  Server connection details
- `JWT_SECRET` — any long random string, e.g. `openssl rand -hex 32`

If you don't already have a SQL Server available, the quickest way to get
one for local development is:

```bash
docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='<a-strong-password>' \
  -p 1433:1433 --name arcade-sql -d mcr.microsoft.com/mssql/server:2022-latest
```

then create a database and a dedicated login for the app (don't use `sa` for
the app itself) before pointing `.env` at it.

## Install and run

```bash
npm install
npm run migrate       # creates tables + seeds the games list, safe to re-run
npm run dev:backend   # API on :3000
npm run dev:frontend  # Vite dev server on :5173, proxies /api to :3000
```

Open http://localhost:5173. The frontend hot-reloads; the backend restarts
automatically on file changes (`tsx watch`).

## Checks before opening a PR

```bash
npm run typecheck
npm run lint
npm run build
```

These are also what CI runs on every push/PR (`.github/workflows/ci.yml`).
