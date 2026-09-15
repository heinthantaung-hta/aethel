import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { authenticate } from '../middleware/authMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer configuration for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // Derive extension from mimetype for reliability
    const mimeToExt = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.jpg', 'image/heif': '.jpg' };
    const ext = mimeToExt[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `avatar-${req.user.user_id}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // Accept by MIME type (more reliable than extension)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type: ${file.mimetype}. Accepted: JPG, PNG, GIF, WebP.`));
    }
  },
});

// Wrapper to catch multer errors and return 400 instead of 500
function handleUpload(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Upload Error', message: err.message });
    }
    next();
  });
}

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// ──────────────────────────────────────────────────────────────
// PUT /api/profile — Update profile fields
// ──────────────────────────────────────────────────────────────
router.put('/', async (req, res, next) => {
  try {
    const { display_name, bio, username } = req.body;
    const userId = req.user.user_id;

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIdx++}`);
      values.push(display_name.trim().slice(0, 100));
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIdx++}`);
      values.push(bio.slice(0, 500));
    }
    if (username !== undefined) {
      if (username.trim().length < 3 || username.trim().length > 50) {
        return res.status(400).json({ error: 'Validation Error', message: 'Username must be 3–50 characters.' });
      }
      // Check uniqueness
      const existing = await pool.query(
        'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
        [username.trim(), userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Conflict', message: 'That username is already taken.' });
      }
      updates.push(`username = $${paramIdx++}`);
      values.push(username.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'No fields to update.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramIdx}
       RETURNING user_id, email, username, display_name, bio, avatar_url, role, created_at, updated_at`,
      values
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/profile/avatar — Upload profile photo
// ──────────────────────────────────────────────────────────────
router.post('/avatar', handleUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No image file provided.' });
    }

    const userId = req.user.user_id;
    const avatarUrl = `/uploads/${req.file.filename}`;

    // Delete old avatar file if it exists
    const oldUser = await pool.query('SELECT avatar_url FROM users WHERE user_id = $1', [userId]);
    if (oldUser.rows[0]?.avatar_url) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(oldUser.rows[0].avatar_url));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2
       RETURNING user_id, email, username, display_name, bio, avatar_url, role, created_at, updated_at`,
      [avatarUrl, userId]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/profile/avatar — Remove profile photo
// ──────────────────────────────────────────────────────────────
router.delete('/avatar', async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const oldUser = await pool.query('SELECT avatar_url FROM users WHERE user_id = $1', [userId]);
    if (oldUser.rows[0]?.avatar_url) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(oldUser.rows[0].avatar_url));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET avatar_url = '', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1
       RETURNING user_id, email, username, display_name, bio, avatar_url, role, created_at, updated_at`,
      [userId]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/profile/u/:username — View any user's public profile + collection
// ──────────────────────────────────────────────────────────────
router.get('/u/:username', async (req, res, next) => {
  try {
    const { username } = req.params;

    // Get user info (public fields only)
    const { rows: userRows } = await pool.query(
      `SELECT user_id, username, display_name, bio, avatar_url, role, created_at
       FROM users WHERE username = $1`,
      [username]
    );
    if (userRows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }
    const profileUser = userRows[0];

    // Get their movie collection
    const { rows: movies } = await pool.query(`
      SELECT
        mi.item_id, mi.title, mi.release_year, mi.rating,
        mi.completion_status, mi.poster_url, mi.overview, mi.tmdb_id,
        mi.date_logged, it.type_name,
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
      WHERE mi.user_id = $1
      GROUP BY mi.item_id, it.type_name
      ORDER BY mi.date_logged DESC
    `, [profileUser.user_id]);

    // Get their stats
    const { rows: statsRows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE completion_status = 'Completed')::int AS completed,
        COUNT(*) FILTER (WHERE completion_status = 'Watching')::int AS in_progress,
        COUNT(*) FILTER (WHERE completion_status = 'Want to Watch')::int AS backlog
      FROM media_items WHERE user_id = $1
    `, [profileUser.user_id]);

    // Get their published posts (with counts)
    const { rows: posts } = await pool.query(`
      SELECT
        p.post_id, p.title, p.body, p.media_type, p.media_title,
        p.poster_url, p.release_year, p.tmdb_id, p.rating,
        p.created_at,
        COUNT(DISTINCT l.user_id)::int AS love_count,
        COUNT(DISTINCT c.comment_id)::int AS comment_count
      FROM posts p
      LEFT JOIN loves l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id
      WHERE p.user_id = $1 AND p.status = 'published'
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
    `, [profileUser.user_id]);

    res.json({
      user: profileUser,
      stats: statsRows[0],
      movies,
      posts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
