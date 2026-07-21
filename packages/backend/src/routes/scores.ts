import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex.js';
import { validateSpaceInvadersSubmission } from '../games/spaceInvaders.js';
import { validateTicTacToeSubmission } from '../games/ticTacToe.js';
import { requireAuth } from '../middleware/auth.js';

export const scoresRouter = Router();

async function insertScore(
  userId: number,
  gameSlug: string,
  score: number,
  points: number,
  metadata: unknown,
): Promise<void> {
  const game = await db('Games').where({ Slug: gameSlug }).first();
  if (!game) {
    throw new Error(`Game not registered: ${gameSlug}`);
  }
  await db('Scores').insert({
    UserId: userId,
    GameId: game.Id,
    Score: score,
    Points: points,
    Metadata: JSON.stringify(metadata),
  });
}

const moveSchema = z.object({
  index: z.number().int().min(0).max(8),
  player: z.enum(['X', 'O']),
});

const ticTacToeSubmissionSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  moves: z.array(moveSchema).min(1).max(9),
});

scoresRouter.post('/tic-tac-toe/scores', requireAuth, async (req, res) => {
  const parsed = ticTacToeSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateTicTacToeSubmission(parsed.data);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await insertScore(req.user!.id, 'tic-tac-toe', verdict.points, verdict.points, {
    difficulty: parsed.data.difficulty,
    outcome: verdict.outcome,
  });

  res.status(201).json({ outcome: verdict.outcome, points: verdict.points });
});

const spaceInvadersSubmissionSchema = z.object({
  score: z.number().int().min(0),
  elapsedMs: z.number().min(0),
});

scoresRouter.post('/space-invaders/scores', requireAuth, async (req, res) => {
  const parsed = spaceInvadersSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateSpaceInvadersSubmission(parsed.data);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await insertScore(req.user!.id, 'space-invaders', parsed.data.score, verdict.points, {
    score: parsed.data.score,
  });

  res.status(201).json({ score: parsed.data.score, points: verdict.points });
});
