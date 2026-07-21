# Deployment

This covers self-hosting the app generically. It deliberately doesn't
describe any particular server's topology, domain names, or container
naming — wire those up however fits your own infrastructure.

## Building the image

```bash
docker build -t arcade .
```

This is a multi-stage build: it installs dependencies, builds `shared` →
`frontend` → `backend`, then produces a slim `node:24-alpine` runtime image
containing only production dependencies and the compiled output. The
resulting container serves both the API (`/api/*`) and the built frontend
(with an SPA fallback) on a single port (`3000` by default).

## Running it

The container needs these environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the app listens on (default `3000`) |
| `NODE_ENV` | Set to `production` |
| `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | SQL Server connection |
| `JWT_SECRET` | Random secret used to sign session cookies |

```bash
docker run --env-file .env -p 3000:3000 arcade
```

Run the migration once against the target database before (or as part of)
first deploy:

```bash
DB_SERVER=... DB_PORT=... DB_NAME=... DB_USER=... DB_PASSWORD=... \
  npx tsx packages/backend/src/db/migrate.ts
```

(or run `npm run migrate` from a checkout with `.env` pointed at the target
database).

## Reverse proxy / TLS

The container serves plain HTTP — put a reverse proxy (nginx, Caddy,
Traefik, etc.) in front to terminate TLS and forward to the container's
port. The app trusts `Secure`/cookie behavior based on `NODE_ENV=production`,
so make sure that's set once you're serving over HTTPS.

## Database

The app expects a SQL Server database it has `db_owner`-equivalent access to
(it runs its own migrations, no external migration tooling required). A
dedicated, least-privilege login scoped to just that one database — rather
than a shared admin account — is recommended.
