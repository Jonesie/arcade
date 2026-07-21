import { Router } from 'express';
import { db } from '../db/knex.js';

export const gamesRouter = Router();

gamesRouter.get('/', async (_req, res) => {
  const games = await db('Games').select('Slug', 'Name').orderBy('Name');
  res.json({ games });
});
