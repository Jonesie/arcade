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
