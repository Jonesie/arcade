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
