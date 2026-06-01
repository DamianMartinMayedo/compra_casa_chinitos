import 'dotenv/config';

export default {
  databaseUrl: process.env.DATABASE_URL,
  dir: 'db/migrations',
  direction: 'up',
  migrationsTable: 'pgmigrations',
  verbose: true,
};
