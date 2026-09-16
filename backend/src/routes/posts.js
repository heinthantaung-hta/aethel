import { Router } from 'express';
import pool from '../config/db.js';
import { requireUser } from '../middleware/adminMiddleware.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// GET /api/posts — Public feed (published posts, newest first)
// ──────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { rows } = await pool.query(`
      SELECT
        p.post_id, p.title, p.body, p.media_type, p.media_title,
        p.poster_url, p.release_year, p.tmdb_id, p.rating,
        p.status, p.created_at,
        u.user_id, u.username, u.display_name, u.avatar_url,
        u.role AS author_role, COALESCE((to_jsonb(u)->>'is_banned')::boolean, FALSE) AS author_is_banned,
        COUNT(DISTINCT l.user_id)::int AS love_count,
        COUNT(DISTINCT c.comment_id)::int AS comment_count,
        BOOL_OR(l.user_id = $1) AS loved_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN loves l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id
      WHERE p.status = 'published'
      GROUP BY p.post_id, u.user_id
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [userId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/posts/:id — Single post with details
// ──────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { rows } = await pool.query(`
      SELECT
        p.post_id, p.title, p.body, p.media_type, p.media_title,
        p.poster_url, p.release_year, p.tmdb_id, p.rating,
        p.status, p.created_at,
        u.user_id, u.username, u.display_name, u.avatar_url,
        u.role AS author_role, COALESCE((to_jsonb(u)->>'is_banned')::boolean, FALSE) AS author_is_banned,
        COUNT(DISTINCT l.user_id)::int AS love_count,
        COUNT(DISTINCT c.comment_id)::int AS comment_count,
        BOOL_OR(l.user_id = $2) AS loved_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN loves l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id
      WHERE p.post_id = $1 AND p.status = 'published'
      GROUP BY p.post_id, u.user_id
    `, [req.params.id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/posts — Create a post
// ──────────────────────────────────────────────────────────────
router.post('/', requireUser, async (req, res, next) => {
  try {
    const { title, body, media_type, media_title, poster_url, release_year, tmdb_id, rating } = req.body;

    const errors = [];
    if (!title || title.trim().length === 0) errors.push('Title is required.');
    if (!body || body.trim().length === 0) errors.push('Body is required.');
    if (!['Movie'].includes(media_type)) errors.push('Only Movie posts are supported.');
    if (!media_title || media_title.trim().length === 0) errors.push('Media title is required.');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation Error', message: errors.join(' '), details: errors });
    }

    const { rows } = await pool.query(
      `INSERT INTO posts (user_id, title, body, media_type, media_title, poster_url, release_year, tmdb_id, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.user_id, title.trim(), body.trim(), media_type, media_title.trim(),
       poster_url || '', release_year || null, tmdb_id || null, rating || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PUT /api/posts/:id — Edit own post
// ──────────────────────────────────────────────────────────────
router.put('/:id', requireUser, async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title and body are required.' });
    }
    const { rows, rowCount } = await pool.query(
      `UPDATE posts SET title = $1, body = $2, updated_at = CURRENT_TIMESTAMP
       WHERE post_id = $3 AND user_id = $4
       RETURNING *`,
      [title.trim(), body.trim(), req.params.id, req.user.user_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found or not yours.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/posts/:id — Delete own post
// ──────────────────────────────────────────────────────────────
router.delete('/:id', requireUser, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM posts WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.user_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found or not yours.' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/posts/:id/love — Toggle love
// ──────────────────────────────────────────────────────────────
router.post('/:id/love', requireUser, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.user_id;

    // Check if already loved
    const existing = await pool.query(
      'SELECT 1 FROM loves WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existing.rows.length > 0) {
      // Unlove
      await pool.query('DELETE FROM loves WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    } else {
      // Love
      await pool.query('INSERT INTO loves (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
    }

    // Return updated count
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS love_count FROM loves WHERE post_id = $1',
      [postId]
    );

    res.json({
      loved: existing.rows.length === 0,
      love_count: rows[0].love_count,
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/posts/:id/comments — Get comments + replies for a post
// ──────────────────────────────────────────────────────────────
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.comment_id, c.body, c.created_at, c.updated_at,
        c.parent_comment_id,
        u.user_id, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/posts/:id/comments — Add a comment or reply
// ──────────────────────────────────────────────────────────────
router.post('/:id/comments', requireUser, async (req, res, next) => {
  try {
    const { body, parent_comment_id } = req.body;
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'Comment body is required.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, user_id, body, parent_comment_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.user_id, body.trim(), parent_comment_id || null]
    );

    const comment = await pool.query(`
      SELECT c.comment_id, c.body, c.created_at, c.updated_at, c.parent_comment_id,
             u.user_id, u.username, u.display_name, u.avatar_url
      FROM comments c JOIN users u ON c.user_id = u.user_id
      WHERE c.comment_id = $1
    `, [rows[0].comment_id]);

    res.status(201).json(comment.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PUT /api/posts/comments/:commentId — Edit own comment
// ──────────────────────────────────────────────────────────────
router.put('/comments/:commentId', requireUser, async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'Body is required.' });
    }
    const { rows, rowCount } = await pool.query(
      `UPDATE comments SET body = $1, updated_at = CURRENT_TIMESTAMP
       WHERE comment_id = $2 AND user_id = $3
       RETURNING comment_id, body, created_at, updated_at, parent_comment_id`,
      [body.trim(), req.params.commentId, req.user.user_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Comment not found or not yours.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/comments/:commentId — Delete own comment
// ──────────────────────────────────────────────────────────────
router.delete('/comments/:commentId', requireUser, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM comments WHERE comment_id = $1 AND user_id = $2',
      [req.params.commentId, req.user.user_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Comment not found or not yours.' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
