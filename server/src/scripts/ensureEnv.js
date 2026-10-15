// Runs before anything reads the settings: if server/.env does not exist yet,
// create it from .env.example and ask for the PostgreSQL password to be filled in.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envFile = path.join(serverRoot, '.env');
const exampleFile = path.join(serverRoot, '.env.example');

if (!fs.existsSync(envFile) && fs.existsSync(exampleFile)) {
  fs.copyFileSync(exampleFile, envFile);
  console.log('\nCreated server/.env from server/.env.example.');
  console.log('Open server/.env, set PGUSER and PGPASSWORD to your PostgreSQL login,');
  console.log('then run "npm run db:setup" again.\n');
  process.exit(0);
}
