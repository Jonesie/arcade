# Arcade

A self-hosted arcade site: create a local account, play games, and climb both
a per-game leaderboard and a site-wide leaderboard that combines your scores
across every game. Games are added one at a time — first up is Tic-Tac-Toe.

## Stack

- **Frontend**: React 19 + TypeScript + Vite, React Router, TanStack Query, SCSS Modules
- **Backend**: Node.js 24 + TypeScript + Express, Knex (SQL Server)
- **Auth**: local username/password (bcrypt), JWT in an httpOnly cookie
- **Database**: Microsoft SQL Server

See [doc/architecture.md](doc/architecture.md) for how the pieces fit
together, and [doc/adding-a-game.md](doc/adding-a-game.md) for how new games
plug in.

## Quickstart

### Local development (no Docker)

Requires Node 24 (`nvm use`) and a reachable SQL Server instance.

```bash
cp .env.example .env   # fill in DB_* and JWT_SECRET
npm install
npm run migrate        # creates tables + seeds the game list
npm run dev:backend    # in one terminal — API on :3000
npm run dev:frontend   # in another — Vite dev server on :5173, proxies /api to :3000
```

Open http://localhost:5173.

### Docker

```bash
cp .env.example .env
docker compose up --build
```

Serves the built app (API + frontend) from a single container on :3000. See
[doc/deployment.md](doc/deployment.md) for self-hosting behind a reverse
proxy.

## Registration protections

Registration sends a real verification email to whatever address is given,
so it's a target for scripted signup spam — left unchecked, that turns into
bounced mail against your own sending account's reputation. A few layers
guard against it, all in `packages/backend/src/routes/auth.ts`:

- **Honeypot field**: an input hidden from real users but that naive bots
  fill in anyway; a non-empty value fails registration with the same
  generic error a normal validation failure gives, so it doesn't tip the
  bot off. No setup needed.
- **MX/domain check** (`services/emailDomain.ts`): before creating an
  account or sending anything, the email's domain must actually resolve
  (MX, falling back to A/AAAA) — a domain that can't receive mail is
  rejected up front instead of guaranteeing a bounce. No setup needed.
- **Per-route rate limit**: registration gets its own stricter budget
  (6/hour/IP) on top of the general `/api/auth` limiter. No setup needed.
- **Cloudflare Turnstile CAPTCHA**: off by default — leaving
  `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` unset in `.env` skips
  CAPTCHA verification entirely, so local dev needs no Turnstile account.
  To enable it:
  1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to
     **Turnstile → Add site** (free, no credit card). Add your domain (or
     `localhost` for local testing) and pick the **Managed** widget mode —
     usually invisible, occasionally shows a checkbox.
  2. Copy the **Site Key** (public) and **Secret Key** (private) it gives
     you into `.env`:
     ```bash
     TURNSTILE_SITE_KEY=...
     TURNSTILE_SECRET_KEY=...
     ```
  3. Restart the backend (or rebuild/redeploy). The register page fetches
     the site key from `GET /api/config` at runtime and renders the widget
     automatically — no frontend rebuild needed just to toggle this, since
     it isn't baked in at Vite build time.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:backend` / `dev:frontend` | Run each side in watch mode |
| `npm run build` | Build `shared` → `frontend` → `backend` for production |
| `npm run migrate` | Apply database migrations (idempotent) |
| `npm run typecheck` / `npm run lint` | Static checks across all workspaces |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
