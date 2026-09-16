import { Router } from 'express';
import pool from '../config/db.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = Router();

// All admin routes require admin role
router.use(requireAdmin);

// ──────────────────────────────────────────────────────────────
// GET /api/admin/posts — All posts (any status)
// ──────────────────────────────────────────────────────────────
router.get('/posts', async (req, res, next) => {
  try {
    const statusFilter = req.query.status;
    let query = `
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        COUNT(DISTINCT l.user_id)::int AS love_count,
        COUNT(DISTINCT c.comment_id)::int AS comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN loves l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id
    `;
    const params = [];

    if (statusFilter && ['published', 'flagged', 'removed'].includes(statusFilter)) {
      query += ' WHERE p.status = $1';
      params.push(statusFilter);
    }

    query += ' GROUP BY p.post_id, u.user_id ORDER BY p.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/admin/users — All users with stats
// ──────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    // Ensure is_banned column exists (idempotent)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE`);
    const { rows } = await pool.query(`
      SELECT u.user_id, u.email, u.username, u.display_name, u.avatar_url,
             u.role, u.is_banned, u.created_at,
             COUNT(DISTINCT p.post_id)::int AS post_count,
             COUNT(DISTINCT c.comment_id)::int AS comment_count
      FROM users u
      LEFT JOIN posts p ON u.user_id = p.user_id
      LEFT JOIN comments c ON u.user_id = c.user_id
      GROUP BY u.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/admin/posts/:id/status — Flag/remove/restore post
// ──────────────────────────────────────────────────────────────
router.patch('/posts/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['published', 'flagged', 'removed'].includes(status)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid status.' });
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE posts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE post_id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/admin/posts/:id — Hard delete post
// ──────────────────────────────────────────────────────────────
router.delete('/posts/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM posts WHERE post_id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found.' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/admin/comments/:id — Delete any comment
// ──────────────────────────────────────────────────────────────
router.delete('/comments/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM comments WHERE comment_id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Comment not found.' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/role — Promote/demote user
// ──────────────────────────────────────────────────────────────
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Role must be user or admin.' });
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE users SET role = $1 WHERE user_id = $2
       RETURNING user_id, email, username, display_name, role`,
      [role, req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/ban — Ban / unban a user
// ──────────────────────────────────────────────────────────────
router.patch('/users/:id/ban', async (req, res, next) => {
  try {
    const { banned } = req.body; // boolean
    if (typeof banned !== 'boolean') {
      return res.status(400).json({ error: 'Validation Error', message: '`banned` must be a boolean.' });
    }
    if (banned && Number(req.params.id) === req.user.user_id) {
      return res.status(400).json({ message: 'You cannot ban your own account.' });
    }
    const { rows, rowCount } = await pool.query(
      `UPDATE users SET is_banned = $1 WHERE user_id = $2 AND (role <> 'admin' OR $1 = FALSE)
       RETURNING user_id, email, username, display_name, role, is_banned`,
      [banned, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not Found', message: 'User not found or administrator accounts cannot be banned.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/admin/reports — All reports with details
// ──────────────────────────────────────────────────────────────
router.get('/reports', async (req, res, next) => {
  try {
    const statusFilter = req.query.status;
    let query = `
      SELECT r.*,
        reporter.username AS reporter_username,
        reporter.display_name AS reporter_display_name,
        reporter.avatar_url AS reporter_avatar_url,
        CASE
          WHEN r.report_type = 'post' THEN (
            SELECT json_build_object(
              'post_id', p.post_id, 'title', p.title, 'body', p.body,
              'media_title', p.media_title, 'status', p.status,
              'username', pu.username, 'display_name', pu.display_name
            ) FROM posts p JOIN users pu ON p.user_id = pu.user_id WHERE p.post_id = r.target_id
          )
          WHEN r.report_type = 'user' THEN (
            SELECT json_build_object(
              'user_id', tu.user_id, 'username', tu.username,
              'display_name', tu.display_name, 'avatar_url', tu.avatar_url,
              'is_banned', COALESCE((to_jsonb(tu)->>'is_banned')::boolean, FALSE), 'role', tu.role
            ) FROM users tu WHERE tu.user_id = r.target_id
          )
          WHEN r.report_type = 'comment' THEN (
            SELECT json_build_object(
              'comment_id', cm.comment_id, 'body', cm.body,
              'username', cu.username, 'display_name', cu.display_name
            ) FROM comments cm JOIN users cu ON cm.user_id = cu.user_id WHERE cm.comment_id = r.target_id
          )
        END AS target_details,
        resolver.username AS resolved_by_username
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.user_id
      LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
    `;
    const params = [];
    if (statusFilter && ['pending', 'reviewed', 'resolved', 'dismissed'].includes(statusFilter)) {
      query += ' WHERE r.status = $1';
      params.push(statusFilter);
    }
    query += ' ORDER BY r.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/admin/reports/:id — Resolve/dismiss a report
// ──────────────────────────────────────────────────────────────
router.patch('/reports/:id', async (req, res, next) => {
  try {
    const { status, admin_note } = req.body;
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be reviewed, resolved, or dismissed.' });
    }
    if (admin_note !== undefined && (typeof admin_note !== 'string' || admin_note.length > 2000)) {
      return res.status(400).json({ message: 'Admin note must be text of at most 2,000 characters.' });
    }
    const { rows, rowCount } = await pool.query(
      `UPDATE reports SET status = $1, admin_note = COALESCE($2, admin_note),
       resolved_at = CASE WHEN $1 IN ('resolved','dismissed') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
       resolved_by = CASE WHEN $1 IN ('resolved','dismissed') THEN $3 ELSE resolved_by END
       WHERE report_id = $4 AND status IN ('pending', 'reviewed') RETURNING *`,
      [status, admin_note ?? null, req.user.user_id, req.params.id]
    );
    if (rowCount === 0) return res.status(409).json({ message: 'Report is no longer open or was deleted. Refresh to see the latest status.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/admin/reports/count — Pending report count (for badge)
// ──────────────────────────────────────────────────────────────
router.get('/reports/count', async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'pending'");
    res.json({ count: rows[0].count });
  } catch (err) {
    next(err);
  }
});

export default router;
