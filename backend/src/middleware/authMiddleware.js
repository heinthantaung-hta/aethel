import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aethel_dev_secret_key_change_in_production';

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches user data to req.user.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      username: decoded.username,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token.',
    });
  }

  try {
    // Older databases gain is_banned when admin users are first loaded.
    // Reading it through JSON also supports those databases before that upgrade.
    const { rows } = await pool.query(
      `SELECT COALESCE((to_jsonb(u)->>'is_banned')::boolean, FALSE) AS is_banned
       FROM users u WHERE user_id = $1`, [req.user.user_id]
    );
    if (!rows.length) return res.status(401).json({ message: 'Account no longer exists.' });
    if (rows[0].is_banned) return res.status(403).json({ message: 'Your account has been banned. Contact an administrator.' });
    next();
  } catch (error) { next(error); }
}

export { JWT_SECRET };
