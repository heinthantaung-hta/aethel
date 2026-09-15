import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import pool from '../config/db.js';
import { authenticate, JWT_SECRET } from '../middleware/authMiddleware.js';
import { sendVerificationEmail, generateCode, generateRecoveryCodes } from '../utils/email.js';

const IS_DEV = !process.env.RESEND_API_KEY;

const router = Router();
const SALT_ROUNDS = 12;
const CODE_EXPIRY_MIN = 10;

// Helper: create a short-lived temp token (for 2FA step)
function createTempToken(userId, purpose) {
  return jwt.sign({ user_id: userId, purpose }, JWT_SECRET, { expiresIn: '5m' });
}

// Helper: create a full session token
function createSessionToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ──────────────────────────────────────────────────────────────
// POST /api/auth/signup — Register a new user (sends email code)
// ──────────────────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Validation
    const errors = [];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('A valid email is required.');
    }
    if (!username || username.trim().length < 3 || username.trim().length > 50) {
      errors.push('Username must be 3–50 characters.');
    }
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation Error', message: errors.join(' '), details: errors });
    }

    // Check for existing user
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with that email or username already exists.',
      });
    }

    // Generate verification code
    const code = generateCode();
    const codeExpires = new Date(Date.now() + CODE_EXPIRY_MIN * 60 * 1000);

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const isAdmin = email.toLowerCase() === 'admin@aethel.io';
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name, role, email_verified, email_verify_token, email_verify_expires)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
       RETURNING user_id, email, username, display_name, bio, avatar_url, role, created_at`,
      [email.toLowerCase(), username.trim(), passwordHash, username.trim(), isAdmin ? 'admin' : 'user', code, codeExpires]
    );

    const user = rows[0];

    // Send verification email
    await sendVerificationEmail(user.email, code, user.username);

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: 'Account created. Please check your email for a verification code.',
      ...(IS_DEV && { devCode: code }),
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/verify-email — Verify email with 6-digit code
// ──────────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    if (user.email_verify_token !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.email_verify_expires)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified
    await pool.query(
      'UPDATE users SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL WHERE user_id = $1',
      [user.user_id]
    );

    // Issue token
    const token = createSessionToken(user);
    const { password_hash, email_verify_token, email_verify_expires, totp_secret, recovery_codes, ...safeUser } = user;
    safeUser.email_verified = true;

    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/resend-code — Resend verification email
// ──────────────────────────────────────────────────────────────
router.post('/resend-code', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];
    if (user.email_verified) return res.status(400).json({ error: 'Email is already verified.' });

    // Rate limit: don't resend if code was sent less than 60s ago
    if (user.email_verify_expires) {
      const sentAt = new Date(user.email_verify_expires).getTime() - CODE_EXPIRY_MIN * 60 * 1000;
      if (Date.now() - sentAt < 60000) {
        return res.status(429).json({ error: 'Please wait before requesting a new code.' });
      }
    }

    const code = generateCode();
    const codeExpires = new Date(Date.now() + CODE_EXPIRY_MIN * 60 * 1000);

    await pool.query(
      'UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE user_id = $3',
      [code, codeExpires, user.user_id]
    );

    await sendVerificationEmail(user.email, code, user.username);

    res.json({ message: 'Verification code resent.', ...(IS_DEV && { devCode: code }) });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/login — Authenticate user (with email verify + 2FA)
// ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required.',
      });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    // Check: email not verified → resend code
    if (!user.email_verified) {
      const code = generateCode();
      const codeExpires = new Date(Date.now() + CODE_EXPIRY_MIN * 60 * 1000);
      await pool.query(
        'UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE user_id = $3',
        [code, codeExpires, user.user_id]
      );
      await sendVerificationEmail(user.email, code, user.username);

      return res.json({
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email first. A new code has been sent.',
        ...(IS_DEV && { devCode: code }),
      });
    }

    // Check: 2FA enabled → require TOTP
    if (user.totp_enabled) {
      const tempToken = createTempToken(user.user_id, '2fa');
      return res.json({
        requires2FA: true,
        tempToken,
        message: 'Please enter your 2FA code.',
      });
    }

    // Normal login — issue token
    const token = createSessionToken(user);
    const { password_hash, email_verify_token, email_verify_expires, totp_secret, recovery_codes, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/verify-2fa — Verify TOTP code during login
// ──────────────────────────────────────────────────────────────
router.post('/verify-2fa', async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Token and code are required.' });
    }

    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (payload.purpose !== '2fa') {
      return res.status(400).json({ error: 'Invalid token.' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [payload.user_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];

    // Try TOTP code first
    const { TOTP } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'Aethel',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: user.totp_secret,
    });

    const delta = totp.validate({ token: code.replace(/\s/g, ''), window: 1 });

    if (delta !== null) {
      // Valid TOTP code
      const token = createSessionToken(user);
      const { password_hash, email_verify_token, email_verify_expires, totp_secret, recovery_codes, ...safeUser } = user;
      return res.json({ token, user: safeUser });
    }

    // Try recovery codes
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();
    const recoveryIdx = (user.recovery_codes || []).indexOf(normalizedCode);
    if (recoveryIdx !== -1) {
      // Valid recovery code — use it (remove from list)
      const updatedCodes = [...user.recovery_codes];
      updatedCodes.splice(recoveryIdx, 1);
      await pool.query('UPDATE users SET recovery_codes = $1 WHERE user_id = $2', [updatedCodes, user.user_id]);

      const token = createSessionToken(user);
      const { password_hash, email_verify_token, email_verify_expires, totp_secret, recovery_codes: rc, ...safeUser } = user;
      return res.json({
        token,
        user: safeUser,
        warning: `Recovery code used. ${updatedCodes.length} remaining.`,
      });
    }

    return res.status(401).json({ error: 'Invalid authentication code.' });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/setup-2fa — Generate TOTP secret + QR code
// ──────────────────────────────────────────────────────────────
router.post('/setup-2fa', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT totp_enabled FROM users WHERE user_id = $1', [req.user.user_id]);
    if (rows[0]?.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled.' });
    }

    const { TOTP, Secret } = await import('otpauth');
    const secret = new Secret({ size: 20 });

    const { rows: userRows } = await pool.query('SELECT email FROM users WHERE user_id = $1', [req.user.user_id]);
    const email = userRows[0].email;

    const totp = new TOTP({
      issuer: 'Aethel',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#E50914', light: '#0E1116' },
    });

    // Store secret temporarily (not enabled yet)
    await pool.query(
      'UPDATE users SET totp_secret = $1 WHERE user_id = $2',
      [secret.base32, req.user.user_id]
    );

    res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/confirm-2fa — Verify TOTP code to enable 2FA
// ──────────────────────────────────────────────────────────────
router.post('/confirm-2fa', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const { rows } = await pool.query('SELECT totp_secret, totp_enabled FROM users WHERE user_id = $1', [req.user.user_id]);
    if (rows[0]?.totp_enabled) return res.status(400).json({ error: '2FA is already enabled.' });
    if (!rows[0]?.totp_secret) return res.status(400).json({ error: 'Please run 2FA setup first.' });

    const { TOTP } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'Aethel',
      label: req.user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: rows[0].totp_secret,
    });

    const delta = totp.validate({ token: code.replace(/\s/g, ''), window: 1 });
    if (delta === null) {
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes(8);

    await pool.query(
      'UPDATE users SET totp_enabled = TRUE, recovery_codes = $1 WHERE user_id = $2',
      [recoveryCodes, req.user.user_id]
    );

    res.json({
      message: '2FA is now enabled!',
      recoveryCodes,
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/disable-2fa — Disable 2FA with password
// ──────────────────────────────────────────────────────────────
router.post('/disable-2fa', authenticate, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required to disable 2FA.' });

    const { rows } = await pool.query('SELECT password_hash, totp_enabled FROM users WHERE user_id = $1', [req.user.user_id]);
    if (!rows[0]?.totp_enabled) return res.status(400).json({ error: '2FA is not enabled.' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

    await pool.query(
      "UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, recovery_codes = '{}' WHERE user_id = $1",
      [req.user.user_id]
    );

    res.json({ message: '2FA has been disabled.' });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/auth/me — Get current authenticated user
// ──────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, email, username, display_name, bio, avatar_url, role, 
              email_verified, totp_enabled, created_at, updated_at
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
