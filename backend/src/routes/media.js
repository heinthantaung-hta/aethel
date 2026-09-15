import { Router } from 'express';
import pool from '../config/db.js';
import { validateMediaItem, validateStatusUpdate, validateRatingUpdate } from '../middleware/validate.js';
import { requireUser } from '../middleware/adminMiddleware.js';
import collectionTransfer from './collectionTransfer.js';
import { lockCollection, findDuplicate } from '../utils/collectionBackup.js';

const router = Router();
router.use(collectionTransfer);

// ──────────────────────────────────────────────────────────────
// Helper: Build a media item query with aggregated genres
// All queries are scoped by user_id via parameterized WHERE clause
// ──────────────────────────────────────────────────────────────
function buildMediaQuery(whereClause = '', orderClause = 'ORDER BY mi.date_logged DESC', limitClause = '') {
  return `
    SELECT
      mi.item_id,
      mi.title,
      mi.release_year,
      mi.rating,
      mi.completion_status,
      mi.poster_url,
      mi.overview,
      mi.tmdb_id,
      mi.date_logged,
      mi.type_id,
      it.type_name,
      COALESCE(
        json_agg(
          json_build_object('genre_id', g.genre_id, 'genre_name', g.genre_name)
        ) FILTER (WHERE g.genre_id IS NOT NULL),
        '[]'
      ) AS genres
    FROM media_items mi
    JOIN item_types it ON mi.type_id = it.type_id
    LEFT JOIN media_item_genres mig ON mi.item_id = mig.item_id
    LEFT JOIN genres g ON mig.genre_id = g.genre_id
    ${whereClause}
    GROUP BY mi.item_id, it.type_name
    ${orderClause}
    ${limitClause}
  `;
}

// ──────────────────────────────────────────────────────────────
// GET /api/media — List all media items for current user
// ──────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      buildMediaQuery('WHERE mi.user_id = $1'),
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/stats — Aggregate KPI counts for current user
// ──────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE completion_status = 'Completed')::int AS completed,
        COUNT(*) FILTER (WHERE completion_status = 'Watching')::int AS in_progress,
        COUNT(*) FILTER (WHERE completion_status = 'Want to Watch')::int AS backlog
      FROM media_items
      WHERE user_id = $1
    `, [req.user.user_id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/latest — LIFO: 5 most recently logged
// ──────────────────────────────────────────────────────────────
router.get('/latest', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      buildMediaQuery('WHERE mi.user_id = $1', 'ORDER BY mi.date_logged DESC', 'LIMIT 5'),
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/backlog — All watchlist items for current user
// ──────────────────────────────────────────────────────────────
router.get('/backlog', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      buildMediaQuery(
        "WHERE mi.completion_status = 'Want to Watch' AND mi.user_id = $1",
        'ORDER BY mi.date_logged ASC'
      ),
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/backlog-next — FIFO: Oldest watchlist item
// ──────────────────────────────────────────────────────────────
router.get('/backlog-next', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      buildMediaQuery(
        "WHERE mi.completion_status = 'Want to Watch' AND mi.user_id = $1",
        'ORDER BY mi.date_logged ASC',
        'LIMIT 1'
      ),
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.json({ message: 'Watchlist is empty. All caught up!' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/types — List all item types (for reference)
// ──────────────────────────────────────────────────────────────
router.get('/types', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT type_id, type_name FROM item_types ORDER BY type_id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/genres — List all genres (for form checkboxes)
// ──────────────────────────────────────────────────────────────
router.get('/genres', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT genre_id, genre_name FROM genres ORDER BY genre_name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/media/:id — Get single media item (scoped)
// ──────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      buildMediaQuery('WHERE mi.item_id = $1 AND mi.user_id = $2'),
      [id, req.user.user_id]
    );
    if (rows.length === 0) {
      const err = new Error('Media item not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/media — Create a new movie entry (transactional)
// ──────────────────────────────────────────────────────────────
router.post('/', requireUser, validateMediaItem, async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const {
      title, release_year, rating, completion_status,
      genre_ids, poster_url = '', overview = '', tmdb_id = null
    } = req.body;
    const userId = req.user.user_id;

    // Look up Movie type_id dynamically
    const typeResult = await client.query(
      `SELECT type_id FROM item_types WHERE type_name = 'Movie' LIMIT 1`
    );
    const movieTypeId = typeResult.rows[0]?.type_id;
    if (!movieTypeId) throw new Error('Movie type not found in database.');

    await client.query('BEGIN');
    await lockCollection(client, userId);
    const duplicate = await findDuplicate(client, userId, req.body);
    if (duplicate) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This movie is already in your collection.', existing_item_id: duplicate.item_id });
    }

    const { rows } = await client.query(
      `INSERT INTO media_items
         (title, release_year, rating, completion_status, poster_url, overview, tmdb_id, type_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING item_id`,
      [title, release_year, rating, completion_status, poster_url, overview, tmdb_id, movieTypeId, userId]
    );
    const itemId = rows[0].item_id;

    if (genre_ids.length > 0) {
      const values = genre_ids.map((gid, i) => `($1, $${i + 2})`).join(', ');
      const params = [itemId, ...genre_ids];
      await client.query(
        `INSERT INTO media_item_genres (item_id, genre_id) VALUES ${values}`,
        params
      );
    }

    await client.query('COMMIT');

    const created = await pool.query(
      buildMediaQuery('WHERE mi.item_id = $1 AND mi.user_id = $2'),
      [itemId, userId]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
});

// ──────────────────────────────────────────────────────────────
// PUT /api/media/:id — Update a movie entry (transactional)
// ──────────────────────────────────────────────────────────────
router.put('/:id', requireUser, validateMediaItem, async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const { id } = req.params;
    const {
      title, release_year, rating, completion_status,
      genre_ids, poster_url = '', overview = '', tmdb_id = null
    } = req.body;
    const userId = req.user.user_id;

    await client.query('BEGIN');
    await lockCollection(client, userId);
    const duplicate = await findDuplicate(client, userId, req.body, id);
    if (duplicate) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This movie is already in your collection.', existing_item_id: duplicate.item_id });
    }

    const { rowCount } = await client.query(
      `UPDATE media_items
       SET title = $1, release_year = $2, rating = $3, completion_status = $4,
           poster_url = $5, overview = $6, tmdb_id = $7
       WHERE item_id = $8 AND user_id = $9`,
      [title, release_year, rating, completion_status, poster_url, overview, tmdb_id, id, userId]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Media item not found.');
      err.statusCode = 404;
      return next(err);
    }

    await client.query('DELETE FROM media_item_genres WHERE item_id = $1', [id]);
    if (genre_ids.length > 0) {
      const values = genre_ids.map((gid, i) => `($1, $${i + 2})`).join(', ');
      const params = [id, ...genre_ids];
      await client.query(
        `INSERT INTO media_item_genres (item_id, genre_id) VALUES ${values}`,
        params
      );
    }

    await client.query('COMMIT');

    const updated = await pool.query(
      buildMediaQuery('WHERE mi.item_id = $1 AND mi.user_id = $2'),
      [id, userId]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/media/:id/status — Update completion status only
// ──────────────────────────────────────────────────────────────
router.patch('/:id/status', requireUser, validateStatusUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completion_status } = req.body;

    // If moving away from Completed, clear rating
    const clearRating = completion_status !== 'Completed';
    const { rows, rowCount } = await pool.query(
      `UPDATE media_items
       SET completion_status = $1 ${clearRating ? ', rating = NULL' : ''}
       WHERE item_id = $2 AND user_id = $3 RETURNING *`,
      [completion_status, id, req.user.user_id]
    );

    if (rowCount === 0) {
      const err = new Error('Media item not found.');
      err.statusCode = 404;
      return next(err);
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/media/:id/rating — Update rating only (Completed items)
// ──────────────────────────────────────────────────────────────
router.patch('/:id/rating', requireUser, validateRatingUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const { rows, rowCount } = await pool.query(
      `UPDATE media_items SET rating = $1
       WHERE item_id = $2 AND user_id = $3 AND completion_status = 'Completed'
       RETURNING *`,
      [rating, id, req.user.user_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Item not found or not completed.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/media/:id — Delete a movie entry (cascade)
// ──────────────────────────────────────────────────────────────
router.delete('/:id', requireUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM media_items WHERE item_id = $1 AND user_id = $2',
      [id, req.user.user_id]
    );

    if (rowCount === 0) {
      const err = new Error('Media item not found.');
      err.statusCode = 404;
      return next(err);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
