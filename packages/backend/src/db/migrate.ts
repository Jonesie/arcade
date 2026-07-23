import { db } from './knex.js';

async function migrate() {
  if (!(await db.schema.hasTable('Users'))) {
    await db.schema.createTable('Users', (t) => {
      t.increments('Id').primary();
      t.string('Username', 50).notNullable().unique();
      t.string('PasswordHash', 200).notNullable();
      t.string('DisplayName', 50).notNullable();
      t.dateTime('CreatedAt').notNullable().defaultTo(db.fn.now());
    });
    console.log('Created Users table');
  }

  // Email-based registration (GitHub issue #12), added after the Users
  // table already had real accounts in it. Existing accounts keep logging
  // in with their Username and simply have Email = NULL — they're never
  // backfilled or forced to set one, though the profile page lets them
  // add one voluntarily. Username itself becomes optional going forward:
  // new accounts register with email only and never get one. Split into
  // separate, independently-idempotent steps (rather than one block gated
  // on a single hasColumn check) because SQL Server requires dropping the
  // old plain-unique index on Username before it can be altered, so a
  // partial failure between steps must be safely re-runnable on its own.
  if (!(await db.schema.hasColumn('Users', 'Email'))) {
    await db.schema.alterTable('Users', (t) => {
      t.string('Email', 254).nullable();
      t.boolean('EmailVerified').notNullable().defaultTo(false);
      t.string('EmailVerificationCode', 10).nullable();
      t.dateTime('EmailVerificationExpiresAt').nullable();
      t.dateTime('EmailVerificationSentAt').nullable();
      t.boolean('Subscribed').notNullable().defaultTo(false);
      t.boolean('Blocked').notNullable().defaultTo(false);
    });
    console.log('Added email/verification/subscription/moderation columns to Users');
  }

  const usernameColumn = await db('INFORMATION_SCHEMA.COLUMNS')
    .where({ TABLE_NAME: 'Users', COLUMN_NAME: 'Username' })
    .first();
  if (usernameColumn?.IS_NULLABLE === 'NO') {
    // Knex's original `.unique()` created this as a plain (not
    // NULL-multiplicity-safe) unique index — SQL Server allows only one
    // NULL under a plain unique index/constraint, unlike most databases,
    // and it also blocks ALTER COLUMN outright while it exists.
    await db.raw('DROP INDEX [users_username_unique] ON [Users]');
    await db.schema.alterTable('Users', (t) => {
      t.string('Username', 50).nullable().alter();
    });
    await db.raw('CREATE UNIQUE INDEX ix_users_username ON [Users]([Username]) WHERE [Username] IS NOT NULL');
    console.log('Made Users.Username nullable (email-only accounts no longer get one)');
  }

  const hasEmailIndex = await db('sys.indexes').where({ name: 'ix_users_email' }).first();
  if (!hasEmailIndex) {
    // Same NULL-multiplicity problem as Username above — almost every
    // existing row has Email = NULL, so this must be a filtered index.
    await db.raw('CREATE UNIQUE INDEX ix_users_email ON [Users]([Email]) WHERE [Email] IS NOT NULL');
    console.log('Added filtered unique index on Users.Email');
  }

  if (!(await db.schema.hasTable('Games'))) {
    await db.schema.createTable('Games', (t) => {
      t.increments('Id').primary();
      t.string('Slug', 50).notNullable().unique();
      t.string('Name', 100).notNullable();
      t.dateTime('CreatedAt').notNullable().defaultTo(db.fn.now());
    });
    console.log('Created Games table');
  }

  if (!(await db.schema.hasTable('Scores'))) {
    await db.schema.createTable('Scores', (t) => {
      t.increments('Id').primary();
      t.integer('UserId').unsigned().notNullable().references('Id').inTable('Users');
      t.integer('GameId').unsigned().notNullable().references('Id').inTable('Games');
      t.integer('Score').notNullable();
      t.integer('Points').notNullable();
      t.text('Metadata');
      t.dateTime('CreatedAt').notNullable().defaultTo(db.fn.now());
      t.index(['GameId', 'Score'], 'ix_scores_game');
      t.index(['UserId'], 'ix_scores_user');
    });
    console.log('Created Scores table');
  }

  const seedGames = [
    { Slug: 'tic-tac-toe', Name: 'Tic-Tac-Toe' },
    { Slug: 'space-invaders', Name: 'Space Invaders' },
    { Slug: 'galaga', Name: 'Galaga' },
    { Slug: 'frogger', Name: 'Frogger' },
    { Slug: 'asteroids', Name: 'Asteroids' },
    { Slug: 'defender', Name: 'Defender' },
    { Slug: 'donkey-kong', Name: 'Donkey Kong' },
  ];
  for (const game of seedGames) {
    const existing = await db('Games').where({ Slug: game.Slug }).first();
    if (!existing) {
      await db('Games').insert(game);
      console.log(`Seeded ${game.Slug} game row`);
    }
  }

  console.log('Migration complete');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
