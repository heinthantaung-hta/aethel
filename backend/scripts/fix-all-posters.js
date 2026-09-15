/**
 * fix-all-posters.js
 * Fetches correct poster_url from TMDB for every post and media_item.
 * Uses retries and delays to handle intermittent network failures.
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

const TMDB_KEY  = process.env.TMDB_API_KEY;
const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await sleep(500 * (i + 1));
  }
  return null;
}

async function getPosterForTitle(title) {
  const data = await fetchWithRetry(
    `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&page=1`
  );
  if (!data) return null;
  const hit = data.results?.[0];
  return hit?.poster_path ? `${IMG_BASE}${hit.poster_path}` : null;
}

async function main() {
  const client = await pool.connect();
  console.log('\n🖼️  Fixing ALL poster URLs via TMDB search...\n');

  try {
    // ── 1. Get all unique movie titles from both tables ──────
    const { rows: postTitles } = await client.query(
      `SELECT DISTINCT media_title AS title FROM posts WHERE media_title IS NOT NULL`
    );
    const { rows: itemTitles } = await client.query(
      `SELECT DISTINCT title FROM media_items WHERE title IS NOT NULL`
    );

    const allTitles = [...new Set([
      ...postTitles.map(r => r.title),
      ...itemTitles.map(r => r.title),
    ])];

    console.log(`Found ${allTitles.length} unique movie titles to process.\n`);

    // ── 2. Fetch poster for each title ──────────────────────
    const posterMap = {};
    let found = 0;
    let failed = 0;

    for (const title of allTitles) {
      const posterUrl = await getPosterForTitle(title);
      if (posterUrl) {
        posterMap[title] = posterUrl;
        found++;
        console.log(`  ✅  ${title}`);
      } else {
        failed++;
        console.log(`  ❌  ${title} — no poster found`);
      }
      await sleep(250); // rate limit
    }

    console.log(`\n📊  Found posters for ${found}/${allTitles.length} titles (${failed} failed).\n`);

    // ── 3. Update posts table ───────────────────────────────
    let postCount = 0;
    for (const [title, url] of Object.entries(posterMap)) {
      const { rowCount } = await client.query(
        `UPDATE posts SET poster_url = $1 WHERE media_title = $2`,
        [url, title]
      );
      postCount += rowCount;
    }
    console.log(`  📝  Updated ${postCount} posts.`);

    // ── 4. Update media_items table ─────────────────────────
    let itemCount = 0;
    for (const [title, url] of Object.entries(posterMap)) {
      const { rowCount } = await client.query(
        `UPDATE media_items SET poster_url = $1 WHERE title = $2`,
        [url, title]
      );
      itemCount += rowCount;
    }
    console.log(`  🎬  Updated ${itemCount} media items.`);

    console.log(`\n✅  All done!\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
