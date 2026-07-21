# Adding a game

Games are meant to be added one at a time without touching the platform
shell (auth, nav, leaderboards). Use tic-tac-toe as the reference
implementation for each piece below.

## 1. Shared game logic — `packages/shared/src/<game>.ts`

Anything needed to determine a game's outcome from raw play data: board/move
validation, win conditions, an AI opponent if applicable, and a
`pointsFor(...)`-style function that turns a game-specific outcome into a
normalized point value (see `doc/architecture.md` for why points, not raw
score, drive the global leaderboard). Export it from
`packages/shared/src/index.ts`.

This code has to run identically on the client (to actually play the game)
and the server (to independently verify a submission) — keep it pure
(no DOM, no Express, no I/O) so it works in both places unmodified.

## 2. Server-side validation — `packages/backend/src/games/<game>.ts`

A small wrapper around the shared logic that takes whatever raw evidence the
client submits (e.g. tic-tac-toe's full move list) and returns a verdict:
either `{ valid: true, outcome, points }` computed independently by the
server, or `{ valid: false, reason }`. **Never accept a client-submitted score
directly** — see `packages/backend/src/games/ticTacToe.ts` for the pattern.

## 3. Score submission route — `packages/backend/src/routes/scores.ts`

Add a `POST /api/games/<slug>/scores` handler (or a new router if it doesn't
fit alongside the existing one) that validates the request body with `zod`,
calls your validator, and inserts a `Scores` row with the server-computed
`Score`/`Points` on success.

## 4. Register the game — migration seed

Add the game's `Slug`/`Name` to the seed step in
`packages/backend/src/db/migrate.ts` (same pattern as the `tic-tac-toe` row).
The leaderboard routes and the `GET /api/games` list both key off this table.

## 5. Frontend component — `packages/frontend/src/games/<game>/`

Build the playable game as a self-contained React component (state, board
rendering, any client-side AI, and the score-submission call on game end).
Style it with a co-located `*.module.scss` file.

## 6. Register it — `packages/frontend/src/games/registry.ts`

Add one entry: `{ slug, name, description, icon, component }`. `icon` is a
small component rendered on the home page tile — for tic-tac-toe it's a
plain inline SVG (`TicTacToeIcon.tsx`) using the site's existing CSS color
variables, not an image asset; follow that pattern unless a game genuinely
needs a raster image. That's the only change needed in the shell — the home
page's game grid, the `/games/:slug` route, and the leaderboard page's
per-game tab all read from this registry automatically.
