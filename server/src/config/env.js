import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_ROOT = path.resolve(here, '..', '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

export const env = {
  port: Number(process.env.PORT) || 4000,
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  db: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'splitease',
  },
  uploadsDir: path.join(SERVER_ROOT, 'uploads'),
  databaseDir: path.join(PROJECT_ROOT, 'database'),
  clientDist: path.join(PROJECT_ROOT, 'client', 'dist'),
};
