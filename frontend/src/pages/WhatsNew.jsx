import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ── Genre ID → Name map (TMDB standard) ──────────────────────
const GENRES = {
  28:'Action', 12:'Adventure', 16:'Animation', 35:'Comedy', 80:'Crime',
  99:'Documentary', 18:'Drama', 10751:'Family', 14:'Fantasy', 36:'History',
  27:'Horror', 10402:'Music', 9648:'Mystery', 10749:'Romance', 878:'Sci-Fi',
  10770:'TV Movie', 53:'Thriller', 10752:'War', 37:'Western',
};

// ── Tabs config ───────────────────────────────────────────────
const TABS = [
  {
    key: 'now_playing',
    label: 'In Theaters',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375z" />
      </svg>
    ),
    fetcher: () => api.getNowPlaying(),
    badge: { text: 'NOW SHOWING', color: '#E50914', bg: 'rgba(229,9,20,0.12)', border: 'rgba(229,9,20,0.3)' },
    description: 'Currently playing in theaters worldwide',
  },
  {
    key: 'upcoming',
    label: 'Coming Soon',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
      </svg>
    ),
    fetcher: () => api.getUpcoming(),
    badge: { text: 'COMING SOON', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },
    description: 'Movies releasing in the coming weeks',
  },
  {
    key: 'trending',
    label: 'Trending',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    fetcher: () => api.getTrending(),
    badge: { text: 'THIS WEEK', color: '#F5C518', bg: 'rgba(245,197,24,0.12)', border: 'rgba(245,197,24,0.3)' },
    description: 'Most talked about movies this week',
  },
  {
    key: 'popular',
    label: 'Popular',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    fetcher: () => api.getPopular(),
    badge: { text: 'ALL TIME', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    description: 'Most popular movies across the globe',
  },
];

// ── Format release date ───────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Days until release ────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return null;
  if (days <= 7) return `${days}d away`;
  if (days <= 30) return `${Math.round(days/7)}w away`;
  return `${Math.round(days/30)}mo away`;
}

// ── Skeleton Cards ────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-xl" style={{ background: '#22252D' }} />
          <div className="mt-2 space-y-1.5">
            <div className="h-3 rounded" style={{ background: '#22252D', width: '80%' }} />
            <div className="h-2.5 rounded" style={{ background: '#22252D', width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Movie Card ────────────────────────────────────────────────
function MovieCard({ movie, badge, tabKey }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const countdown = tabKey === 'upcoming' ? daysUntil(movie.release_date) : null;
  const genres = (movie.genre_ids || []).slice(0, 2).map(id => GENRES[id]).filter(Boolean);

  return (
    <div className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden"
        style={{ background: '#22252D', border: '1px solid #2C313A' }}>

        {/* Skeleton until loaded */}
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse" style={{ background: '#22252D' }} />
        )}

        <img
          src={movie.poster_url}
          alt={movie.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className="w-full h-full object-cover transition-transform duration-500"
          style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)', opacity: imgLoaded ? 1 : 0 }}
        />

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to top, rgba(15,17,21,0.95) 0%, rgba(15,17,21,0.3) 50%, transparent 100%)',
            opacity: hovered ? 1 : 0,
          }} />

        {/* Hover content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 transition-all duration-300"
          style={{ transform: hovered ? 'translateY(0)' : 'translateY(8px)', opacity: hovered ? 1 : 0 }}>
          {movie.overview && (
            <p className="text-[11px] leading-snug line-clamp-3 mb-2" style={{ color: '#A0A4AE' }}>
              {movie.overview}
            </p>
          )}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.map(g => (
                <span key={g} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#A0A4AE' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Rating badge — top right */}
        {movie.vote_average > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <svg className="w-2.5 h-2.5" fill="#F5C518" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-[10px] font-bold text-white">{movie.vote_average}</span>
          </div>
        )}

        {/* Countdown badge — upcoming tab */}
        {countdown && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg"
            style={{ background: 'rgba(96,165,250,0.8)', backdropFilter: 'blur(4px)' }}>
            <span className="text-[9px] font-black text-white">{countdown}</span>
          </div>
        )}

        {/* Status badge — now playing */}
        {tabKey === 'now_playing' && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg flex items-center gap-1"
            style={{ background: 'rgba(229,9,20,0.8)', backdropFilter: 'blur(4px)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] font-black text-white">LIVE</span>
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-[#E50914] transition-colors">
          {movie.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {movie.release_date && (
            <span className="text-[11px]" style={{ color: '#5a5f6e' }}>
              {tabKey === 'upcoming' ? formatDate(movie.release_date) : movie.release_year}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Spotlight hero banner (first movie of the tab) ────────────
function SpotlightBanner({ movie, badge }) {
  if (!movie?.backdrop_url && !movie?.poster_url) return null;
  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-6 animate-fade-in"
      style={{ minHeight: 220, border: '1px solid #2C313A' }}>
      {/* Backdrop */}
      <img
        src={movie.backdrop_url || movie.poster_url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.35)' }}
      />
      {/* Gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(15,17,21,0.95) 0%, rgba(15,17,21,0.5) 60%, transparent 100%)' }} />
      {/* Content */}
      <div className="relative z-10 p-6 flex items-end h-full" style={{ minHeight: 220 }}>
        <div className="flex gap-4 items-end">
          {movie.poster_url && (
            <img src={movie.poster_url} alt={movie.title}
              className="w-24 rounded-xl shadow-2xl shrink-0"
              style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
          )}
          <div>
            <span className="inline-block text-[10px] font-black px-2.5 py-1 rounded-full mb-2"
              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              🎬 {badge.text} — SPOTLIGHT
            </span>
            <h2 className="text-xl font-black text-white leading-tight">{movie.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1 text-sm font-bold" style={{ color: '#F5C518' }}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {movie.vote_average}
                </span>
              )}
              {movie.release_date && (
                <span className="text-sm" style={{ color: '#A0A4AE' }}>{formatDate(movie.release_date)}</span>
              )}
            </div>
            {movie.overview && (
              <p className="text-sm mt-2 line-clamp-2 max-w-lg" style={{ color: '#A0A4AE' }}>{movie.overview}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function WhatsNew() {
  const [activeTab, setActiveTab] = useState('now_playing');
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const currentTab = TABS.find(t => t.key === activeTab);

  const loadTab = useCallback(async (key) => {
    if (data[key]) return; // cached
    const tab = TABS.find(t => t.key === key);
    if (!tab) return;
    try {
      setLoading(true); setError(null);
      const results = await tab.fetcher();
      setData(prev => ({ ...prev, [key]: results }));
    } catch (err) {
      setError('Failed to load. Please try again.');
    } finally { setLoading(false); }
  }, [data]);

  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  const movies = data[activeTab] || [];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#E50914' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#E50914' }}>Live from TMDB</span>
          </div>
          <h1 className="text-2xl font-black text-white">What's New</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0A4AE' }}>
            {currentTab?.description}
          </p>
        </div>
        <div className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: '#22252D', color: '#5a5f6e', border: '1px solid #2C313A' }}>
          Powered by TMDB
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#22252D' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={activeTab === t.key
              ? { background: '#2C313A', color: '#E50914' }
              : { color: '#A0A4AE', background: 'transparent' }}
            onMouseEnter={e => { if (activeTab !== t.key) { e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (activeTab !== t.key) { e.currentTarget.style.color = '#A0A4AE'; } }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {error && (
        <div className="px-4 py-3 rounded-xl mb-4 flex items-center gap-3"
          style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#E50914' }}>{error}</p>
          <button onClick={() => { setData(p => ({ ...p, [activeTab]: undefined })); loadTab(activeTab); }}
            className="ml-auto text-xs font-semibold cursor-pointer" style={{ color: '#E50914' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : (
        <>
          {/* Spotlight banner — top movie */}
          {movies.length > 0 && <SpotlightBanner movie={movies[0]} badge={currentTab.badge} />}

          {/* Badge row */}
          {movies.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black px-3 py-1.5 rounded-full"
                style={{
                  background: currentTab.badge.bg,
                  color: currentTab.badge.color,
                  border: `1px solid ${currentTab.badge.border}`,
                }}>
                {currentTab.badge.text}
              </span>
              <span className="text-xs" style={{ color: '#5a5f6e' }}>{movies.length} movies</span>
            </div>
          )}

          {/* Poster grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map(movie => (
              <MovieCard
                key={movie.tmdb_id}
                movie={movie}
                badge={currentTab.badge}
                tabKey={activeTab}
              />
            ))}
          </div>

          {movies.length === 0 && !loading && !error && (
            <div className="card p-12 text-center">
              <p className="text-white font-semibold">Nothing here yet</p>
              <p className="text-sm mt-1" style={{ color: '#A0A4AE' }}>Try another tab or check back later</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
