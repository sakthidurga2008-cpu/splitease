import pg from 'pg';
import { env } from './env.js';

// Read values the way the app uses them:
//   DATE    -> 'YYYY-MM-DD' string (no time zone shifting)
//   NUMERIC -> JavaScript number
//   BIGINT  -> JavaScript number (COUNT(*) results)
pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1700, (value) => Number(value));
pg.types.setTypeParser(20, (value) => Number(value));

export const pool = new pg.Pool(env.db);

export function query(text, params) {
  return pool.query(text, params);
}

// Runs `work` inside one transaction. Everything it does is committed
// together, or rolled back together if anything throws.
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
