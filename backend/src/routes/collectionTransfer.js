import { Router } from 'express';
import pool from '../config/db.js';
import { requireUser } from '../middleware/adminMiddleware.js';
import { parseBackup, makeBackup, lockCollection, findDuplicate } from '../utils/collectionBackup.js';

const router = Router();

router.get('/export', requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT mi.*, COALESCE(json_agg(json_build_object('genre_name', g.genre_name))
      FILTER (WHERE g.genre_id IS NOT NULL), '[]') AS genres
      FROM media_items mi LEFT JOIN media_item_genres mg USING (item_id)
      LEFT JOIN genres g USING (genre_id) WHERE mi.user_id = $1 GROUP BY mi.item_id ORDER BY mi.date_logged`, [req.user.user_id]);
    res.json(makeBackup(rows));
  } catch (err) { next(err); }
});

router.post('/import', requireUser, async (req, res, next) => {
  let client;
  try {
    let items;
    try { items = parseBackup(req.body); }
    catch (err) { err.type = 'validation'; throw err; }
    client = await pool.connect();
    await client.query('BEGIN');
    await lockCollection(client, req.user.user_id);
    const types = await client.query("SELECT type_id FROM item_types WHERE type_name = 'Movie'");
    if (!types.rows[0]) throw new Error('Movie type is missing.');
    const { rows: genres } = await client.query('SELECT genre_id, genre_name FROM genres');
    const genreMap = new Map(genres.map(g => [g.genre_name.toLowerCase(), g.genre_id]));
    // Validate the whole file before making any inserts. Genre names make backups portable.
    for (const item of items) for (const genre of item.genres) {
      if (!genreMap.has(genre.toLowerCase())) {
        const err = new Error(`Unknown genre "${genre}" in "${item.title}". No movies were imported.`);
        err.type = 'validation'; throw err;
      }
    }
    let imported = 0;
    let skipped = 0;
    for (const item of items) {
      if (await findDuplicate(client, req.user.user_id, item)) { skipped++; continue; }
      const { rows } = await client.query(`INSERT INTO media_items
        (title, release_year, rating, completion_status, poster_url, overview, tmdb_id, type_id, user_id, date_logged)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamp, CURRENT_TIMESTAMP)) RETURNING item_id`,
      [item.title, item.release_year, item.rating, item.completion_status, item.poster_url || '', item.overview || '',
        item.tmdb_id, types.rows[0].type_id, req.user.user_id, item.date_logged]);
      for (const genreId of new Set(item.genres.map(g => genreMap.get(g.toLowerCase())))) {
        await client.query('INSERT INTO media_item_genres (item_id, genre_id) VALUES ($1,$2)', [rows[0].item_id, genreId]);
      }
      imported++;
    }
    await client.query('COMMIT');
    res.json({ imported, skipped });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally { client?.release(); }
});
export default router;
