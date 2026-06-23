import { loadEnvFile } from 'node:process';
import { defineConfig, env } from 'prisma/config';

loadEnvFile('.env');

export default defineConfig({
  engine: 'classic',
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
});
