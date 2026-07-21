import knexFactory, { type Knex } from 'knex';
import { env } from '../env.js';

const config: Knex.Config = {
  client: 'mssql',
  connection: {
    server: env.DB_SERVER,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  } as Knex.MsSqlConnectionConfig,
  pool: { min: 0, max: 10 },
};

export const db = knexFactory(config);
