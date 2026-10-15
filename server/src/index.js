import fs from 'node:fs';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

fs.mkdirSync(env.uploadsDir, { recursive: true });

try {
  await pool.query('SELECT 1 FROM users LIMIT 1');
} catch (error) {
  console.error('\nCould not reach the SplitEase database.');
  console.error(`  ${error.message}`);
  console.error('Check server/.env, then run "npm run db:setup" from the project folder.\n');
  process.exit(1);
}

createApp().listen(env.port, () => {
  console.log(`SplitEase API listening on http://localhost:${env.port}`);
});
