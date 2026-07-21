# Architecture

## Overview

Arcade is an npm-workspaces monorepo with three packages:

```
packages/
  shared/    pure game logic, imported by both frontend and backend
  backend/   Express API + static file server (serves the built frontend)
  frontend/  React SPA
```

In production a single Docker image runs the compiled backend, which serves
`/api/*` and the built frontend's static files (with an SPA fallback) from
one process. In development the frontend runs under the Vite dev server
(`:5173`) and proxies `/api/*` to the backend (`:3000`), so the request path
matches production even though the two run separately.

## Why one shared package

Every game needs its rules implemented twice in spirit — once so the client
can render/play it, once so the server can independently verify a submitted
game before awarding points. Keeping that logic in `packages/shared` means
it's implemented exactly once and imported by both sides, rather than
duplicated and risking drift.

## Data model

Three tables:

- **Users** — `Id, Username (unique), PasswordHash, DisplayName, CreatedAt`
- **Games** — `Id, Slug (unique), Name, CreatedAt` — one row per registered
  game (see `doc/adding-a-game.md`)
- **Scores** — `Id, UserId, GameId, Score, Points, Metadata, CreatedAt`

`Score` is a game's own raw value, used for that game's leaderboard
(`MAX(Score)` per user). `Points` is a normalized value every game must
compute so scores are comparable across games — it's what the site-wide
leaderboard sums (`SUM(Points)` per user). A tic-tac-toe win doesn't mean the
same thing as an Asteroids high score, but points from either can be added
together.

## Auth

Username/password, hashed with bcrypt. On login/register the server signs a
JWT (`{ id, username, displayName }`) and sets it as an httpOnly, `SameSite=Lax`
cookie. There's no server-side session table — the cookie itself is the
session, valid for 30 days or until the user logs out (which just clears the
cookie). `/api/auth/*` is rate-limited to blunt brute-force attempts.

## Anti-cheat

Score submission endpoints never accept a bare "I scored N points" claim.
For tic-tac-toe, the client submits the full move list plus the difficulty
it played against; the server replays those moves through the same
`packages/shared` logic the client used to play, confirms they're legal and
correctly alternate turns, determines the actual outcome itself, and computes
points from `(difficulty, outcome)` server-side. The client's own idea of the
score is never trusted or stored directly. Future games should follow the
same pattern: submit enough raw evidence for the server to derive the result
independently, not a final number.
