import { Router } from 'express';

const router = Router();
const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';

// ──────────────────────────────────────────────────────────────
// GET /api/movies/search?q=<query>
// Proxies to TMDB /search/movie and returns clean movie data.
// ──────────────────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json([]);

    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1&include_adult=false`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = new Error('TMDB search failed');
      err.statusCode = 502;
      return next(err);
    }

    const data = await response.json();

    const results = (data.results || [])
      .filter(m => m.title && m.release_date)
      .slice(0, 8)
      .map(m => ({
        tmdb_id: m.id,
        title: m.title,
        release_year: parseInt(m.release_date.split('-')[0], 10),
        poster_url: m.poster_path ? `${POSTER_BASE}${m.poster_path}` : '',
        overview: m.overview || '',
        vote_average: m.vote_average || 0,
      }));

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/movies/tmdb/:id — Fetch full movie details from TMDB
// ──────────────────────────────────────────────────────────────
router.get('/tmdb/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const url = `${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=en-US`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = new Error('TMDB movie fetch failed');
      err.statusCode = 502;
      return next(err);
    }

    const m = await response.json();
    res.json({
      tmdb_id: m.id,
      title: m.title,
      release_year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : null,
      poster_url: m.poster_path ? `${POSTER_BASE}${m.poster_path}` : '',
      overview: m.overview || '',
      genres: (m.genres || []).map(g => g.name),
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/movies/trending  — Public, no auth needed
// Returns top 12 trending movies from TMDB (day window)
// ──────────────────────────────────────────────────────────────
router.get('/trending', async (req, res, next) => {
  try {
    const url = `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&language=en-US`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = new Error('TMDB trending fetch failed');
      err.statusCode = 502;
      return next(err);
    }

    const data = await response.json();
    const POSTER_W342 = 'https://image.tmdb.org/t/p/w342';

    const results = (data.results || [])
      .filter(m => m.poster_path)
      .slice(0, 12)
      .map(m => ({
        tmdb_id: m.id,
        title: m.title,
        release_year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : null,
        poster_url: `${POSTER_W342}${m.poster_path}`,
        vote_average: m.vote_average ? m.vote_average.toFixed(1) : null,
      }));

    // Cache for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/movies/now-playing  — Movies in theaters now
// ──────────────────────────────────────────────────────────────
router.get('/now-playing', async (req, res, next) => {
  try {
    const url = `${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}&language=en-US&page=1&region=US`;
    const response = await fetch(url);
    if (!response.ok) { const e = new Error('TMDB fetch failed'); e.statusCode = 502; return next(e); }
    const data = await response.json();
    const P = 'https://image.tmdb.org/t/p/w500';
    const results = (data.results || []).filter(m => m.poster_path).slice(0, 20).map(m => ({
      tmdb_id: m.id, title: m.title,
      release_date: m.release_date,
      release_year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : null,
      poster_url: `${P}${m.poster_path}`,
      backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      vote_average: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : null,
      overview: m.overview || '',
      genre_ids: m.genre_ids || [],
    }));
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(results);
  } catch (err) { next(err); }
});

// ──────────────────────────────────────────────────────────────
// GET /api/movies/upcoming  — Movies releasing soon
// ──────────────────────────────────────────────────────────────
router.get('/upcoming', async (req, res, next) => {
  try {
    const url = `${TMDB_BASE}/movie/upcoming?api_key=${TMDB_KEY}&language=en-US&page=1&region=US`;
    const response = await fetch(url);
    if (!response.ok) { const e = new Error('TMDB fetch failed'); e.statusCode = 502; return next(e); }
    const data = await response.json();
    const P = 'https://image.tmdb.org/t/p/w500';
    const results = (data.results || []).filter(m => m.poster_path && m.release_date).slice(0, 20).map(m => ({
      tmdb_id: m.id, title: m.title,
      release_date: m.release_date,
      release_year: parseInt(m.release_date.split('-')[0], 10),
      poster_url: `${P}${m.poster_path}`,
      backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      vote_average: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : null,
      overview: m.overview || '',
      genre_ids: m.genre_ids || [],
    }));
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(results);
  } catch (err) { next(err); }
});

// ──────────────────────────────────────────────────────────────
// GET /api/movies/popular  — Most popular movies right now
// ──────────────────────────────────────────────────────────────
router.get('/popular', async (req, res, next) => {
  try {
    const url = `${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`;
    const response = await fetch(url);
    if (!response.ok) { const e = new Error('TMDB fetch failed'); e.statusCode = 502; return next(e); }
    const data = await response.json();
    const P = 'https://image.tmdb.org/t/p/w500';
    const results = (data.results || []).filter(m => m.poster_path).slice(0, 20).map(m => ({
      tmdb_id: m.id, title: m.title,
      release_date: m.release_date,
      release_year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : null,
      poster_url: `${P}${m.poster_path}`,
      backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      vote_average: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : null,
      overview: m.overview || '',
      genre_ids: m.genre_ids || [],
    }));
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(results);
  } catch (err) { next(err); }
});

export default router;
