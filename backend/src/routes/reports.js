import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// POST /api/reports — Submit a report (any authenticated user)
// ──────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { report_type, target_id, reason, details } = req.body;
    const reporter_id = req.user.user_id;

    // Validate inputs
    if (!['post', 'user', 'comment'].includes(report_type)) {
      return res.status(400).json({ error: 'Invalid report_type. Must be post, user, or comment.' });
    }
    if (!['spam', 'harassment', 'inappropriate', 'misinformation', 'impersonation', 'other'].includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason.' });
    }
    if (!target_id) {
      return res.status(400).json({ error: 'target_id is required.' });
    }

    // Prevent self-reporting
    if (report_type === 'user' && target_id === reporter_id) {
      return res.status(400).json({ error: 'You cannot report yourself.' });
    }

    // Verify target exists
    let exists = false;
    if (report_type === 'post') {
      const { rowCount } = await pool.query('SELECT 1 FROM posts WHERE post_id = $1', [target_id]);
      exists = rowCount > 0;
    } else if (report_type === 'user') {
      const { rowCount } = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [target_id]);
      exists = rowCount > 0;
    } else if (report_type === 'comment') {
      const { rowCount } = await pool.query('SELECT 1 FROM comments WHERE comment_id = $1', [target_id]);
      exists = rowCount > 0;
    }
    if (!exists) {
      return res.status(404).json({ error: `Target ${report_type} not found.` });
    }

    // Check for own post reporting
    if (report_type === 'post') {
      const { rows } = await pool.query('SELECT user_id FROM posts WHERE post_id = $1', [target_id]);
      if (rows[0]?.user_id === reporter_id) {
        return res.status(400).json({ error: 'You cannot report your own post.' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, report_type, target_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reporter_id, report_type, target_id) DO NOTHING
       RETURNING *`,
      [reporter_id, report_type, target_id, reason, details || '']
    );

    if (rows.length === 0) {
      return res.status(409).json({ error: 'You have already reported this.' });
    }

    res.status(201).json({ message: 'Report submitted. Our team will review it shortly.', report: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
