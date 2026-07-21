# Contributing

Thanks for considering a contribution to Arcade.

## Getting set up

See [doc/setup.md](doc/setup.md) for local development instructions.

## Workflow

1. Fork the repo and create a branch off `main`.
2. Make your change. Keep pull requests focused — one feature or fix per PR.
3. Run `npm run typecheck` and `npm run lint` before opening a PR.
4. Open a pull request describing what changed and why.

## Adding a new game

This project is built around a plugin-style registry so new games can be
added without touching the platform shell. See
[doc/adding-a-game.md](doc/adding-a-game.md) for the pattern to follow.

## Code style

- TypeScript everywhere, `strict` mode on.
- Prettier formats the codebase (`npm run format`); please run it before
  committing.
- No new dependencies for something a few lines of code can do.

## Reporting bugs

Open an issue with steps to reproduce, what you expected, and what happened
instead. For security issues, see [SECURITY.md](SECURITY.md) instead of
filing a public issue.
