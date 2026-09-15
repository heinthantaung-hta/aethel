import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

/**
 * MovieSearch — TMDB-powered autocomplete input for movie titles.
 * Props:
 *   onSelect(movie) — called when the user picks a result
 *   initialValue    — pre-fill the input (e.g. when editing)
 */
export default function MovieSearch({ onSelect, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await api.searchMovies(q);
      setResults(data);
      setOpen(data.length > 0);
      setHighlighted(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 320);
  };

  const handleSelect = (movie) => {
    setQuery(movie.title);
    setOpen(false);
    setResults([]);
    onSelect(movie);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      handleSelect(results[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>

        <input
          ref={inputRef}
          id="movie-search-input"
          type="text"
          autoComplete="off"
          placeholder="Search for a movie title…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="input pr-10"
          style={{ background: '#22252D', paddingLeft: '2.25rem' }}
        />

        {/* Loading spinner / clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" style={{ color: '#E50914' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="transition-colors cursor-pointer"
              style={{ color: '#5a5f6e' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}
              aria-label="Clear"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
          style={{ background: '#22252D', border: '1px solid #2C313A' }}>
          <ul className="max-h-80 overflow-y-auto" style={{ borderColor: '#2C313A' }}>
            {results.map((movie, idx) => (
              <li key={movie.tmdb_id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(movie)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    highlighted === idx ? 'bg-[#181A20]' : ''
                  }`}
                  style={{ background: highlighted === idx ? '#181A20' : 'transparent' }}
                >
                  {/* Poster thumbnail */}
                  <div className="w-9 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{movie.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: '#5a5f6e' }}>{movie.release_year}</span>
                      {movie.vote_average > 0 && (
                        <>
                          <span style={{ color: '#2C313A' }}>·</span>
                          <span className="flex items-center gap-0.5 text-xs" style={{ color: '#F5C518' }}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {movie.vote_average.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    {movie.overview && (
                      <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: '#5a5f6e' }}>{movie.overview}</p>
                    )}
                  </div>

                  {highlighted === idx && (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 flex items-center gap-1.5" style={{ borderTop: '1px solid #2C313A' }}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#5a5f6e">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            <p className="text-[10px]" style={{ color: '#5a5f6e' }}>Powered by TMDB</p>
          </div>
        </div>
      )}
    </div>
  );
}
