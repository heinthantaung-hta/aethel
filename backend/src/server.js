import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import mediaRouter from './routes/media.js';
import moviesRouter from './routes/movies.js';
import postsRouter from './routes/posts.js';
import adminRouter from './routes/admin.js';
import reportsRouter from './routes/reports.js';
import { authenticate } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// ── Static file serving (avatar uploads) ─────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'aethel-api', timestamp: new Date().toISOString() });
});

// ── Public Routes ────────────────────────────────────────────
app.use('/api/auth', authRouter);

// Public trending movies — no auth (used by Login / Signup pages)
app.get('/api/movies/trending', async (req, res) => {
  try {
    const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
    const TMDB_KEY  = process.env.TMDB_API_KEY;
    const url = `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&language=en-US`;
    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: 'TMDB fetch failed' });
    const data = await resp.json();
    const results = (data.results || [])
      .filter(m => m.poster_path)
      .slice(0, 12)
      .map(m => ({
        tmdb_id:      m.id,
        title:        m.title,
        release_year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : null,
        poster_url:   `https://image.tmdb.org/t/p/w342${m.poster_path}`,
        vote_average: m.vote_average ? parseFloat(m.vote_average).toFixed(1) : null,
      }));
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to map a TMDB movie to a clean object
function mapMovie(m, posterSize = 'w500') {
  return {
    tmdb_id:      m.id,
    title:        m.title,
    release_date: m.release_date || null,
    release_year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : null,
    poster_url:   m.poster_path ? `https://image.tmdb.org/t/p/${posterSize}${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
    vote_average: m.vote_average ? parseFloat(parseFloat(m.vote_average).toFixed(1)) : null,
    overview:     m.overview || '',
    genre_ids:    m.genre_ids || [],
  };
}

async function tmdbFetch(res, path) {
  const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
  const TMDB_KEY  = process.env.TMDB_API_KEY;
  const resp = await fetch(`${TMDB_BASE}${path}&api_key=${TMDB_KEY}`);
  if (!resp.ok) { res.status(502).json({ error: 'TMDB fetch failed' }); return null; }
  return resp.json();
}

// Public now-playing — no auth needed
app.get('/api/movies/now-playing', async (req, res) => {
  try {
    const data = await tmdbFetch(res, '/movie/now_playing?language=en-US&page=1&region=US');
    if (!data) return;
    const results = (data.results || []).filter(m => m.poster_path).slice(0, 20).map(m => mapMovie(m));
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(results);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Public upcoming — no auth needed
app.get('/api/movies/upcoming', async (req, res) => {
  try {
    const data = await tmdbFetch(res, '/movie/upcoming?language=en-US&page=1&region=US');
    if (!data) return;
    const results = (data.results || []).filter(m => m.poster_path && m.release_date).slice(0, 20).map(m => mapMovie(m));
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(results);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Public popular — no auth needed
app.get('/api/movies/popular', async (req, res) => {
  try {
    const data = await tmdbFetch(res, '/movie/popular?language=en-US&page=1');
    if (!data) return;
    const results = (data.results || []).filter(m => m.poster_path).slice(0, 20).map(m => mapMovie(m));
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(results);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});


// ── Protected Routes ─────────────────────────────────────────
app.use('/api/profile', profileRouter);
app.use('/api/media', authenticate, mediaRouter);
app.use('/api/movies', authenticate, moviesRouter);
app.use('/api/posts', authenticate, postsRouter);
app.use('/api/reports', authenticate, reportsRouter);
app.use('/api/admin', authenticate, adminRouter);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.originalUrl} does not exist.` });
});

// ── Global Error Boundary ────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 Aethel API running at http://localhost:${PORT}`);
  console.log(`  🔐 Auth:    /api/auth`);
  console.log(`  🔥 Feed:    /api/posts`);
  console.log(`  🛡️  Admin:   /api/admin`);
  console.log(`  📦 Media:   /api/media\n`);
});

export default app;
