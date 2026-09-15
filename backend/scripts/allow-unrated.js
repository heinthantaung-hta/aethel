import 'dotenv/config';
import pool from '../src/config/db.js';

// Idempotent migration: preserves all rows and existing ratings.
try {
  await pool.query('ALTER TABLE media_items ALTER COLUMN rating DROP NOT NULL');
  console.log('Unrated movies are now supported. Existing data is unchanged.');
} catch (err) {
  console.error('Could not enable unrated movies:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
