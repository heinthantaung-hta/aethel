import pool from '../config/db.js';

/**
 * Middleware to require admin role.
 * Must be used AFTER authenticate middleware.
 */
export async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT role FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required.',
      });
    }

    req.user.role = 'admin';
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to require a regular user (not admin).
 * Admins are blocked from user-only actions (adding movies, posts, etc.)
 * Must be used AFTER authenticate middleware.
 */
export async function requireUser(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT role FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not found.' });
    }

    if (rows[0].role === 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin accounts cannot perform this action.',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
