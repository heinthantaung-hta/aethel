import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import MovieSearch from '../components/MovieSearch';

export default function CreatePost() {
  const [form, setForm] = useState({
    title: '', body: '', media_type: 'Movie',
    media_title: '', poster_url: '', release_year: null,
    tmdb_id: null,
  });
  const [movieSelected, setMovieSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleMovieSelect = (movie) => {
    if (!movie) {
      setMovieSelected(null);
      setForm(f => ({ ...f, media_title: '', poster_url: '', release_year: null, tmdb_id: null }));
      return;
    }
    setMovieSelected(movie);
    setForm(f => ({
      ...f,
      media_title: movie.title,
      poster_url: movie.poster_url || '',
      release_year: movie.release_year || null,
      tmdb_id: movie.tmdb_id || null,
    }));
    setError('');
  };

  const handleChange = (f, v) => { setForm(p => ({ ...p, [f]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.media_title.trim()) return setError('Please search and select a movie.');
    if (!form.title.trim()) return setError('Give your post a title.');
    if (!form.body.trim()) return setError('Write something about it.');
    try {
      setLoading(true);
      await api.createPost({ ...form, rating: null });
      navigate('/feed');
    } catch (err) { setError(err.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <Link to="/feed"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors"
        style={{ color: '#A0A4AE' }}
        onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
        onMouseLeave={e => e.currentTarget.style.color = '#A0A4AE'}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Feed
      </Link>

      <div className="card p-6">
        <div className="mb-5">
          <h1 className="text-lg font-bold text-white">Share a movie</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0A4AE' }}>Tell everyone about a movie you love</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl animate-scale-in flex items-center gap-3"
            style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium" style={{ color: '#E50914' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Movie search */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>Movie</label>
            <MovieSearch onSelect={handleMovieSelect} initialValue={form.media_title} />
          </div>

          {/* Preview card */}
          {movieSelected && (
            <div className="flex items-center gap-4 p-3 rounded-xl animate-scale-in"
              style={{ background: 'rgba(229,9,20,0.05)', border: '1px solid rgba(229,9,20,0.2)' }}>
              <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0"
                style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                {movieSelected.poster_url ? (
                  <img src={movieSelected.poster_url} alt={movieSelected.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{movieSelected.title}</p>
                {movieSelected.release_year && (
                  <p className="text-xs mt-0.5" style={{ color: '#A0A4AE' }}>{movieSelected.release_year}</p>
                )}
              </div>
            </div>
          )}

          {/* Post title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>Post title</label>
            <input type="text" placeholder='e.g. "This film changed my life"' value={form.title}
              onChange={(e) => handleChange('title', e.target.value)} className="input" maxLength={255} />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A0A4AE' }}>Your thoughts</label>
            <textarea placeholder="Tell us why you love it..." value={form.body}
              onChange={(e) => handleChange('body', e.target.value)} className="input resize-none" rows={5} maxLength={2000} />
            <p className="text-[11px] mt-1 text-right" style={{ color: '#5a5f6e' }}>{form.body.length}/2000</p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Posting...' : 'Share Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
