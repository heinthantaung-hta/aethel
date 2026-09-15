import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import StarRating from '../components/StarRating';
import GenreCheckboxes from '../components/GenreCheckboxes';
import MovieSearch from '../components/MovieSearch';

const STATUSES = ['Want to Watch', 'Watching', 'Completed'];

const statusConfig = {
  'Want to Watch': { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)',  icon: '🎯' },
  'Watching':      { color: '#F5C518', bg: 'rgba(245,197,24,0.12)',  border: 'rgba(245,197,24,0.35)',  icon: '▶️' },
  'Completed':     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)',  icon: '✅' },
};

const initialForm = {
  title: '', release_year: '', rating: 0, completion_status: 'Want to Watch',
  genre_ids: [], poster_url: '', overview: '', tmdb_id: null,
};

export default function AddEntry() {
  const [form, setForm]               = useState(initialForm);
  const [genres, setGenres]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(null);
  const [error, setError]             = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [duplicateId, setDuplicateId] = useState(null);

  useEffect(() => {
    api.getGenres()
      .then(setGenres)
      .catch(() => setError('Failed to load genres.'));
  }, []);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value,
      ...(field === 'completion_status' && value !== 'Completed' ? { rating: 0 } : {}),
    }));
    setError(null); setSuccess(null);
    setDuplicateId(null);
  };

  const handleMovieSelect = (movie) => {
    setDuplicateId(null);
    if (!movie) {
      setSelectedMovie(null);
      setForm((f) => ({ ...f, title: '', release_year: '', poster_url: '', overview: '', tmdb_id: null }));
      return;
    }
    setSelectedMovie(movie);
    setForm((f) => ({ ...f, title: movie.title, release_year: movie.release_year,
      poster_url: movie.poster_url || '', overview: movie.overview || '', tmdb_id: movie.tmdb_id || null }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!form.title.trim()) return setError('Please search for and select a movie.');
    if (!form.release_year || form.release_year < 1800 || form.release_year > 2100)
      return setError('Enter a valid release year (1800–2100).');
    try {
      setLoading(true);
      const created = await api.create({ ...form, release_year: Number(form.release_year),
        rating: form.completion_status === 'Completed' && form.rating > 0 ? form.rating : null,
      });
      setSuccess(`"${created.title}" added to your collection!`);
      setForm(initialForm); setSelectedMovie(null);
    } catch (err) {
      setError(err.data?.message || err.message);
      if (err.status === 409) setDuplicateId(err.data?.existing_item_id || '');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Add Movie</h1>
        <p className="text-sm mt-0.5" style={{ color: '#A0A4AE' }}>Search and log a movie to your collection</p>
      </div>

      {/* Success */}
      {success && (
        <div role="status" className="px-5 py-3.5 rounded-2xl animate-scale-in flex items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#10b981' }}>{success}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="px-5 py-3.5 rounded-2xl animate-scale-in flex flex-wrap items-center gap-3"
          style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#E50914' }}>{error}</p>
          {duplicateId !== null && <Link className="text-sm text-white underline underline-offset-4" to={`/collection${duplicateId ? `#movie-${duplicateId}` : ''}`}>View in collection →</Link>}
        </div>
      )}

      {/* Selected movie preview */}
      {selectedMovie && (
        <div className="card p-4 flex gap-4 animate-scale-in"
          style={{ border: '1px solid rgba(229,9,20,0.25)', background: 'rgba(229,9,20,0.05)' }}>
          {selectedMovie.poster_url ? (
            <img src={selectedMovie.poster_url} alt={selectedMovie.title}
              className="w-16 rounded-xl object-cover shrink-0"
              style={{ border: '1px solid rgba(229,9,20,0.2)' }} />
          ) : (
            <div className="w-16 h-24 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{selectedMovie.title}</p>
                <p className="text-sm" style={{ color: '#A0A4AE' }}>{selectedMovie.release_year}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: 'rgba(229,9,20,0.15)', color: '#E50914', border: '1px solid rgba(229,9,20,0.3)' }}>
                Selected
              </span>
            </div>
            {selectedMovie.overview && (
              <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#5a5f6e' }}>{selectedMovie.overview}</p>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Movie Search */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>
            Movie Title
          </label>
          <MovieSearch onSelect={handleMovieSelect} />
          <p className="text-[11px] mt-1.5" style={{ color: '#5a5f6e' }}>
            Type at least 2 characters to search. Select a result to auto-fill details.
          </p>
        </div>

        {/* Release Year */}
        <div>
          <label htmlFor="entry-year" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>
            Release Year
          </label>
          <input id="entry-year" type="number" placeholder="e.g., 2024"
            min="1800" max="2100" value={form.release_year}
            onChange={(e) => handleChange('release_year', e.target.value)}
            className="input" />
          <p className="text-[11px] mt-1" style={{ color: '#5a5f6e' }}>Auto-filled from search, or enter manually.</p>
        </div>

        {/* Watch Status */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>
            Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => {
              const cfg = statusConfig[s];
              const active = form.completion_status === s;
              return (
                <button key={s} type="button" onClick={() => handleChange('completion_status', s)}
                  className="py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer"
                  style={active
                    ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color }
                    : { background: 'transparent', borderColor: '#2C313A', color: '#5a5f6e' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = cfg.border; e.currentTarget.style.color = cfg.color; e.currentTarget.style.background = cfg.bg; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#2C313A'; e.currentTarget.style.color = '#5a5f6e'; e.currentTarget.style.background = 'transparent'; } }}>
                  {cfg.icon} {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unwatched movies can be saved without inventing a rating. */}
        {form.completion_status === 'Completed' ? <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>
            Your Rating (optional)
          </label>
          <StarRating value={form.rating} onChange={(val) => handleChange('rating', val)} />
          {form.rating > 0 && <button type="button" className="btn-secondary mt-2"
            onClick={() => handleChange('rating', 0)}>Clear rating</button>}
          <p className="text-xs mt-1.5 text-gray-400">Rate now, or leave unrated and decide later in your collection.</p>
        </div> : <p className="text-sm text-gray-400">Save this movie now. You can rate it after marking it completed.</p>}

        {/* Genres */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>
            Genres <span className="normal-case font-normal" style={{ color: '#5a5f6e' }}>(optional)</span>
          </label>
          <GenreCheckboxes genres={genres} selected={form.genre_ids}
            onChange={(ids) => handleChange('genre_ids', ids)} />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding…
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add to Collection
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
