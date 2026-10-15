// Recalculates SPLITS.status for every pair of members from the payments in
// SETTLEMENTS, using the same rule the website applies whenever an expense or
// payment is recorded.
//
//   npm run db:reconcile
//
// Useful after inserting or editing rows by hand in psql.

import { pool, withTransaction } from '../config/db.js';
import { syncAllSplitStatuses } from '../services/ledger.js';

const changed = await withTransaction((db) => syncAllSplitStatuses(db));

if (changed.length === 0) {
  console.log('Every split status already matches the recorded payments.');
} else {
  for (const row of changed) console.log(`Split ${row.split_id}: ${row.from} -> ${row.to}`);
  console.log(`Updated ${changed.length} split${changed.length === 1 ? '' : 's'}.`);
}
await pool.end();
