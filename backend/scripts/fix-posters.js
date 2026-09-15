/**
 * fix-posters.js
 * Fetches correct poster URLs from TMDB for every movie in the DB
 * that has a tmdb_id, and updates the poster_url column.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT, 10),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGHOST === 'localhost' ? false : { rejectUnauthorized: false },
});

const TMDB_KEY = process.env.TMDB_API_KEY;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';  // higher res than w185

async function fixPosters() {
  console.log('\n🎬 Fetching correct poster URLs from TMDB...\n');

  // Get all unique (tmdb_id, title) pairs that have a tmdb_id
  const { rows } = await pool.query(`
    SELECT DISTINCT tmdb_id, title
    FROM media_items
    WHERE tmdb_id IS NOT NULL
    ORDER BY title
  `);

  console.log(`Found ${rows.length} unique movies to fix\n`);

  let updated = 0;
  let failed = 0;

  for (const movie of rows) {
    try {
      const url = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_KEY}&language=en-US`;
      const res = await fetch(url);

      if (!res.ok) {
        console.log(`  ❌ TMDB error for "${movie.title}" (${movie.tmdb_id}): ${res.status}`);
        failed++;
        continue;
      }

      const data = await res.json();

      if (!data.poster_path) {
        console.log(`  ⚠️  No poster for "${movie.title}"`);
        failed++;
        continue;
      }

      const newPosterUrl = `${POSTER_BASE}${data.poster_path}`;

      // Update ALL rows with this tmdb_id (across all users)
      const result = await pool.query(
        `UPDATE media_items SET poster_url = $1 WHERE tmdb_id = $2`,
        [newPosterUrl, movie.tmdb_id]
      );

      console.log(`  ✅ "${movie.title}" → ${data.poster_path} (${result.rowCount} rows)`);
      updated += result.rowCount;

      // Small delay to be polite to TMDB rate limits
      await new Promise(r => setTimeout(r, 80));

    } catch (err) {
      console.log(`  ❌ Failed "${movie.title}": ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Done! Updated ${updated} rows. ${failed} movies had issues.\n`);
  await pool.end();
}

fixPosters().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
