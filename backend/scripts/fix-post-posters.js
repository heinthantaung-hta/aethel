/**
 * fix-post-posters.js
 * Backfills poster_url on all posts that are missing one.
 * Uses the TMDB search API to find the poster by media_title.
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
const IMG_BASE  = 'https://image.tmdb.org/t/p/w342';

// Known poster map so we don't hit the API unnecessarily
const KNOWN_POSTERS = {
  'Inception':                          '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  'The Dark Knight':                    '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'Interstellar':                       '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  'Parasite':                           '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  'Dune':                               '/d5NXSklpcvkBX3n9D2C8JdfX98v.jpg',
  'The Shawshank Redemption':           '/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg',
  'Avengers: Endgame':                  '/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  'Oppenheimer':                        '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  'Everything Everywhere All at Once':  '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
  'Whiplash':                           '/oPFPHHHFg3tReuOB1mb7oqcf3UE.jpg',
  'Mad Max: Fury Road':                 '/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
  'Spider-Man: Into the Spider-Verse':  '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
  'La La Land':                         '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
  'The Godfather':                      '/3bhkrj58Vtu7enYsLeleqKeioz.jpg',
  'Get Out':                            '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
  'Hereditary':                         '/V3bYBs1PygTQFMoq1pu2hBmLnW.jpg',
  'The Revenant':                       '/ji3ecJphATlVgWNY0B0RVXZizja.jpg',
  'Joker':                              '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
  'Blade Runner 2049':                  '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  'The Grand Budapest Hotel':           '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
  'Spirited Away':                      '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
  'Princess Mononoke':                  '/jHArjZDjCEJNgJHBMVCbTKwrFP2.jpg',
  'Psycho':                             '/yz4QVqPx3h551LTiegOyn0oWMqS.jpg',
  'Rear Window':                        '/ILVF0eIP1jTouC2yCKrfBWKFbal.jpg',
  'Oldboy':                             '/pWDtjs568ZfOTMm5C3TSoAYBs8Y.jpg',
  'Burning':                            '/6BzqzBrT3Ixo3JnBqxHMdUeFzrJ.jpg',
  'The Lighthouse':                     '/3ASf9SnEuNk5mNEUAHFV5xnlD4L.jpg',
  'Portrait of a Lady on Fire':         '/3aIsNiyb9jXDCjqAPkB4NiCzNzh.jpg',
  'The Truman Show':                    '/vuza0WqY239yBXOadKlGwJsZJFE.jpg',
  'Midsommar':                          '/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg',
  'Moonlight':                          '/4911T5FbJ9eAlnRPLyo5JaRERUI.jpg',
  '1917':                               '/iZf0KyrE25z1sage4SYFLCCrMi9.jpg',
  'Her':                                '/lEIaL12hSkqqe83kgADkbUMEnUm.jpg',
  'Arrival':                            '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
  'No Country for Old Men':             '/iLwSnGDgLDIgNz8L8XEpyLGJELQ.jpg',
  'Eternal Sunshine':                   '/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg',
  'Titanic':                            '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
  'The Matrix':                         '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
  'Amélie':                             '/hnSFosOJGTGtcpQdYqNIFbmGBFo.jpg',
  'Requiem for a Dream':                '/nOd6vjEmzCT0k4VYqsA2hwyi87C.jpg',
};

async function fetchPosterFromTMDB(title) {
  if (!TMDB_KEY) return null;
  try {
    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&page=1`;
    const res = await fetch(url);
    const data = await res.json();
    const hit = data.results?.[0];
    return hit?.poster_path ? `${IMG_BASE}${hit.poster_path}` : null;
  } catch {
    return null;
  }
}

async function fixPosters() {
  const client = await pool.connect();
  console.log('\n🖼️  Fixing post poster URLs...\n');

  try {
    // Get all posts missing a poster
    const { rows: posts } = await client.query(
      `SELECT post_id, media_title FROM posts WHERE poster_url IS NULL OR poster_url = '' ORDER BY post_id`
    );

    if (posts.length === 0) {
      console.log('✅ All posts already have posters!\n');
      return;
    }

    console.log(`Found ${posts.length} posts missing posters.\n`);

    let fixed = 0;
    // Deduplicate by media_title so we don't repeat TMDB calls
    const titleToUrl = {};

    for (const post of posts) {
      const title = post.media_title;
      if (!title) continue;

      if (!titleToUrl[title]) {
        // Check known map first
        if (KNOWN_POSTERS[title]) {
          titleToUrl[title] = `${IMG_BASE}${KNOWN_POSTERS[title]}`;
        } else {
          // Fall back to TMDB API search
          titleToUrl[title] = await fetchPosterFromTMDB(title);
          await new Promise(r => setTimeout(r, 100)); // rate limit
        }
      }

      const posterUrl = titleToUrl[title];
      if (posterUrl) {
        await client.query(
          'UPDATE posts SET poster_url = $1 WHERE post_id = $2',
          [posterUrl, post.post_id]
        );
        fixed++;
        console.log(`  ✅  "${title}" → poster set`);
      } else {
        console.log(`  ⚠️  "${title}" → no poster found`);
      }
    }

    console.log(`\n✅ Done! Fixed ${fixed}/${posts.length} posts.\n`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPosters();
