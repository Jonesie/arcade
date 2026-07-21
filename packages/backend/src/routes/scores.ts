import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex.js';
import { validateTicTacToeSubmission } from '../games/ticTacToe.js';
import { requireAuth } from '../middleware/auth.js';

export const scoresRouter = Router();

const moveSchema = z.object({
  index: z.number().int().min(0).max(8),
  player: z.enum(['X', 'O']),
});

const submissionSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  moves: z.array(moveSchema).min(1).max(9),
});

scoresRouter.post('/tic-tac-toe/scores', requireAuth, async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateTicTacToeSubmission(parsed.data);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  const game = await db('Games').where({ Slug: 'tic-tac-toe' }).first();
  if (!game) {
    res.status(500).json({ error: 'Game not registered' });
    return;
  }

  await db('Scores').insert({
    UserId: req.user!.id,
    GameId: game.Id,
    Score: verdict.points,
    Points: verdict.points,
    Metadata: JSON.stringify({ difficulty: parsed.data.difficulty, outcome: verdict.outcome }),
  });

  res.status(201).json({ outcome: verdict.outcome, points: verdict.points });
});
