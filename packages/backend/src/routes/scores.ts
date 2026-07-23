import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex.js';
import { validateAsteroidsSubmission } from '../games/asteroids.js';
import { validateDefenderSubmission } from '../games/defender.js';
import { validateFroggerSubmission } from '../games/frogger.js';
import { validateGalagaSubmission } from '../games/galaga.js';
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
  elapsedMs: z.number().min(0).max(300_000).optional(),
});

const ticTacToeSubmissionSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  moves: z.array(moveSchema).min(1).max(9),
  speedMode: z.boolean().optional(),
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
    speedMode: parsed.data.speedMode ?? false,
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

const galagaSubmissionSchema = z.object({
  score: z.number().int().min(0),
  elapsedMs: z.number().min(0),
});

scoresRouter.post('/galaga/scores', requireAuth, async (req, res) => {
  const parsed = galagaSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateGalagaSubmission(parsed.data);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await insertScore(req.user!.id, 'galaga', parsed.data.score, verdict.points, {
    score: parsed.data.score,
  });

  res.status(201).json({ score: parsed.data.score, points: verdict.points });
});

const asteroidsSubmissionSchema = z.object({
  score: z.number().int().min(0),
  elapsedMs: z.number().min(0),
});

scoresRouter.post('/asteroids/scores', requireAuth, async (req, res) => {
  const parsed = asteroidsSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateAsteroidsSubmission(parsed.data);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await insertScore(req.user!.id, 'asteroids', parsed.data.score, verdict.points, {
    score: parsed.data.score,
  });

  res.status(201).json({ score: parsed.data.score, points: verdict.points });
});

const defenderSubmissionSchema = z.object({
  score: z.number().int().min(0),
  elapsedMs: z.number().min(0),
});

scoresRouter.post('/defender/scores', requireAuth, async (req, res) => {
  const parsed = defenderSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateDefenderSubmission(parsed.data);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await insertScore(req.user!.id, 'defender', parsed.data.score, verdict.points, {
    score: parsed.data.score,
  });

  res.status(201).json({ score: parsed.data.score, points: verdict.points });
});

const froggerMoveSchema = z.object({
  tick: z.number().int().min(0),
  dir: z.enum(['up', 'down', 'left', 'right']),
});

const froggerSubmissionSchema = z.object({
  moves: z.array(froggerMoveSchema).max(5000),
  finalTick: z.number().int().min(0),
});

// Note there's no `score` field in this schema at all — see
// packages/backend/src/games/frogger.ts for why.
scoresRouter.post('/frogger/scores', requireAuth, async (req, res) => {
  const parsed = froggerSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const verdict = validateFroggerSubmission(parsed.data.moves, parsed.data.finalTick);
  if (!verdict.valid) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await insertScore(req.user!.id, 'frogger', verdict.score, verdict.points, {
    moveCount: parsed.data.moves.length,
  });

  res.status(201).json({ score: verdict.score, points: verdict.points });
});
