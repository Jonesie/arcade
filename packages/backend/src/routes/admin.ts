import { Router } from 'express';
import { db } from '../db/knex.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res) => {
  const users = await db('Users')
    .leftJoin('Scores', 'Scores.UserId', 'Users.Id')
    .groupBy(
      'Users.Id',
      'Users.Username',
      'Users.DisplayName',
      'Users.Email',
      'Users.EmailVerified',
      'Users.Subscribed',
      'Users.Blocked',
      'Users.CreatedAt',
    )
    .select(
      'Users.Id as id',
      'Users.Username as username',
      'Users.DisplayName as displayName',
      'Users.Email as email',
      'Users.EmailVerified as emailVerified',
      'Users.Subscribed as subscribed',
      'Users.Blocked as blocked',
      'Users.CreatedAt as createdAt',
    )
    .sum({ totalPoints: 'Scores.Points' })
    .orderBy('Users.CreatedAt', 'asc');

  res.json({ users });
});

adminRouter.post('/users/:id/block', async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }
  if (targetId === req.user!.id) {
    res.status(400).json({ error: "You can't block your own account" });
    return;
  }
  const updated = await db('Users').where({ Id: targetId }).update({ Blocked: true });
  if (updated === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(204).end();
});

adminRouter.post('/users/:id/unblock', async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }
  const updated = await db('Users').where({ Id: targetId }).update({ Blocked: false });
  if (updated === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(204).end();
});
