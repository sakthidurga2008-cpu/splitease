// Creates the SplitEase database (if needed), then loads the schema and sample data.
//
//   npm run db:setup                     schema + the sample data from the assignment
//   npm run db:setup -- --as-submitted   same, but leave every row exactly as in the document
//   npm run db:setup -- --empty          schema + only the category and payment lookups
//
// Running it again wipes the tables and starts fresh.
//
// About the default: in the assignment's sample data, three splits (501, 502
// and 505) have a status that does not match the payments recorded against
// them in SETTLEMENTS. After loading the rows, the default run brings those
// statuses in line, the same way the website does after every payment, so the
// site does not show "Pending" beside a debt that has been paid. Use
// --as-submitted to skip that step. database/02_seed.sql itself is never changed.

import './ensureEnv.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { env } from '../config/env.js';
import { syncAllSplitStatuses } from '../services/ledger.js';

const empty = process.argv.includes('--empty');
const asSubmitted = process.argv.includes('--as-submitted');

async function ensureDatabase() {
  const admin = new pg.Client({ ...env.db, database: 'postgres' });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.db.database]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${env.db.database.replace(/"/g, '""')}"`);
      console.log(`Created database "${env.db.database}".`);
    }
  } finally {
    await admin.end();
  }
}

async function run() {
  await ensureDatabase();

  const client = new pg.Client(env.db);
  await client.connect();
  try {
    const schema = await fs.readFile(path.join(env.databaseDir, '01_schema.sql'), 'utf8');
    let seed = await fs.readFile(path.join(env.databaseDir, '02_seed.sql'), 'utf8');

    if (empty) {
      // Keep only the two lookup tables the forms depend on.
      seed = seed
        .split('\n')
        .filter((line) => /^INSERT INTO (categories|payment_method) /.test(line))
        .join('\n');
    }

    await client.query('SET client_min_messages = warning');
    await client.query('BEGIN');
    await client.query(schema);
    await client.query(seed);
    const adjusted = empty || asSubmitted ? [] : await syncAllSplitStatuses(client);
    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT (SELECT COUNT(*) FROM users) AS users,
              (SELECT COUNT(*) FROM groups) AS groups,
              (SELECT COUNT(*) FROM expenses) AS expenses`,
    );
    console.log(`Schema loaded into "${env.db.database}": 10 tables.`);
    if (empty) {
      console.log('No sample data loaded. Create an account on the website to begin.');
      return;
    }
    console.log(`Sample data loaded: ${rows[0].users} users, ${rows[0].groups} groups, ${rows[0].expenses} expenses.`);
    if (adjusted.length > 0) {
      console.log('Split statuses brought in line with the recorded payments:');
      for (const row of adjusted) console.log(`  split ${row.split_id}: ${row.from} -> ${row.to}`);
      console.log('  (run "npm run db:setup -- --as-submitted" to keep the document\'s values)');
    }
    console.log('Try logging in with user ID 1 and password 9876500001.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('\nDatabase setup failed.');
  console.error(`  ${error.message}`);
  console.error('Check the PostgreSQL details in server/.env and that PostgreSQL is running.\n');
  process.exit(1);
});
