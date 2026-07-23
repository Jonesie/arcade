import { Router } from 'express';
import { db } from '../db/knex.js';

export const leaderboardRouter = Router();

// The dev/test account used throughout local testing — real enough to
// have Scores rows, but not a real player, so it's excluded from both
// leaderboards rather than deleting its (occasionally useful) history.
const EXCLUDED_USERNAME = 'testplayer';

leaderboardRouter.get('/global', async (_req, res) => {
  const leaderboard = await db('Scores as s')
    .join('Users as u', 'u.Id', 's.UserId')
    .whereRaw('(u.Username IS NULL OR LOWER(u.Username) != ?)', [EXCLUDED_USERNAME])
    .groupBy('u.Id', 'u.Username', 'u.DisplayName')
    .select('u.Id as userId', 'u.Username as username', 'u.DisplayName as displayName')
    .sum({ totalPoints: 's.Points' })
    .count({ totalPlays: 's.Id' })
    .orderBy('totalPoints', 'desc')
    .limit(50);
  res.json({ leaderboard });
});

leaderboardRouter.get('/games/:slug', async (req, res) => {
  const game = await db('Games').where({ Slug: req.params.slug }).first();
  if (!game) {
    res.status(404).json({ error: 'Unknown game' });
    return;
  }

  const leaderboard = await db('Scores as s')
    .join('Users as u', 'u.Id', 's.UserId')
    .where('s.GameId', game.Id)
    .whereRaw('(u.Username IS NULL OR LOWER(u.Username) != ?)', [EXCLUDED_USERNAME])
    .groupBy('u.Id', 'u.Username', 'u.DisplayName')
    .select('u.Id as userId', 'u.Username as username', 'u.DisplayName as displayName')
    .max({ bestScore: 's.Score' })
    .count({ plays: 's.Id' })
    .orderBy('bestScore', 'desc')
    .limit(50);
  res.json({ leaderboard });
});
