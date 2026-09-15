import { validateMediaItem } from '../middleware/validate.js';

export const MAX_IMPORT_ITEMS = 1000;

export function parseBackup(data) {
  if (!data || data.format !== 'aethel-collection' || data.version !== 1 || !Array.isArray(data.items)) {
    throw new Error('Choose an Aethel collection backup (version 1).');
  }
  if (data.items.length > MAX_IMPORT_ITEMS) throw new Error('Import up to 1,000 movies at a time.');
  return data.items.map((item, index) => {
    try {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid movie.');
      const body = { title: item.title, release_year: item.release_year, rating: item.rating,
        completion_status: item.completion_status, genre_ids: [], poster_url: item.poster_url,
        overview: item.overview, tmdb_id: item.tmdb_id };
      let error;
      validateMediaItem({ body }, {}, err => { error = err; });
      if (error) throw error;
      if (body.title.length > 255) throw new Error('Title is too long.');
      if (item.tmdb_id != null && (!Number.isInteger(item.tmdb_id) || item.tmdb_id <= 0)) throw new Error('Invalid TMDB ID.');
      if (item.poster_url && (typeof item.poster_url !== 'string' || !/^https?:\/\//i.test(item.poster_url))) throw new Error('Invalid poster URL.');
      if (item.overview != null && (typeof item.overview !== 'string' || item.overview.length > 20000)) throw new Error('Invalid overview.');
      if (!Array.isArray(item.genres) || item.genres.length > 50 || item.genres.some(g => typeof g !== 'string' || !g.trim() || g.length > 50)) throw new Error('Invalid genres.');
      if (item.date_logged != null && (typeof item.date_logged !== 'string' || !Number.isFinite(Date.parse(item.date_logged)))) throw new Error('Invalid date added.');
      return { ...body, genres: [...new Set(item.genres.map(g => g.trim()))],
        date_logged: item.date_logged ? new Date(item.date_logged).toISOString() : null };
    } catch (err) { throw new Error(`Movie ${index + 1}: ${err.message}`); }
  });
}

export function makeBackup(items) {
  return { format: 'aethel-collection', version: 1, exported_at: new Date().toISOString(),
    items: items.map(item => ({ title: item.title, release_year: item.release_year,
      completion_status: item.completion_status, rating: item.rating, tmdb_id: item.tmdb_id,
      poster_url: item.poster_url, overview: item.overview, date_logged: item.date_logged,
      genres: item.genres.map(g => g.genre_name) })) };
}

// Serializes creation, edits, and imports for each user, including before migration.
export async function lockCollection(client, userId) {
  await client.query('SELECT pg_advisory_xact_lock(73142, $1::int)', [userId]);
}

export async function findDuplicate(client, userId, item, excludeId = null) {
  const { rows } = await client.query(`SELECT item_id, title FROM media_items
    WHERE user_id = $1 AND ($5::int IS NULL OR item_id <> $5)
    AND ((tmdb_id IS NOT NULL AND tmdb_id = $2)
      OR (lower(btrim(title)) = lower(btrim($3)) AND release_year = $4))
    ORDER BY item_id LIMIT 1`, [userId, item.tmdb_id, item.title, item.release_year, excludeId]);
  return rows[0];
}
