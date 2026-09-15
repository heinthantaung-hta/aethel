import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const QUOTES = [
  { text: "Cinema is a mirror by which we often see ourselves.", author: "Martin Scorsese" },
  { text: "A film is never really good unless the camera is an eye in the head of a poet.", author: "Orson Welles" },
  { text: "Every great film should seem new every time you see it.", author: "Roger Ebert" },
  { text: "Movies touch our hearts and awaken our vision.", author: "Martin Scorsese" },
  { text: "Film is the art of showing without telling.", author: "Stanley Kubrick" },
  { text: "The best films are those that ask questions, not ones that answer them.", author: "Werner Herzog" },
];
const todayQuote = QUOTES[new Date().getDay() % QUOTES.length];

const GENRES = [
  { label: 'Action', emoji: '💥' }, { label: 'Comedy', emoji: '😂' },
  { label: 'Horror', emoji: '😱' }, { label: 'Drama', emoji: '🎭' },
  { label: 'Sci-Fi', emoji: '🚀' }, { label: 'Romance', emoji: '💘' },
  { label: 'Thriller', emoji: '🔪' }, { label: 'Animation', emoji: '✨' },
];

export function LeftSidebar() {
  const { user } = useAuth();
  const [stats, setStats]           = useState(null);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [nowLoading, setNowLoading] = useState(true);
  const [hoveredId, setHoveredId]   = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      api.getStats().then(setStats).catch(() => {});
    }
    api.getNowPlaying()
      .then(data => setNowPlaying((data || []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setNowLoading(false));
  }, [user]);

  return (
    <aside className="space-y-3 sticky top-20 self-start">
      {/* Profile card */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0"
            style={{ border: '2px solid #E50914' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg, #E50914, #c8070f)' }}>
                {(user?.display_name || user?.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.display_name || user?.username}</p>
            <p className="text-[11px] truncate" style={{ color: '#5a5f6e' }}>@{user?.username}</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Total', value: stats.total, color: '#E50914' },
              { label: 'Done', value: stats.completed, color: '#10b981' },
              { label: 'List', value: stats.backlog, color: '#3b82f6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl py-2 px-2 text-center"
                style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
                <p className="text-lg font-black" style={{ color }}>{value ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#5a5f6e' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {user?.role !== 'admin' && (
          <Link to="/collection"
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-colors"
            style={{ background: 'rgba(229,9,20,0.08)', color: '#E50914', border: '1px solid rgba(229,9,20,0.15)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,9,20,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(229,9,20,0.08)'}>
            View My Collection →
          </Link>
        )}
      </div>

      {/* ── What's New Widget ── */}
      <div className="card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#E50914' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A0A4AE' }}>
              In Theaters
            </p>
          </div>
          <Link to="/whatsnew"
            className="text-[10px] font-bold"
            style={{ color: '#E50914' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            See all →
          </Link>
        </div>

        {/* 2-column poster grid */}
        {nowLoading ? (
          <div className="grid grid-cols-3 gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg"
                style={{ aspectRatio: '2/3', background: '#22252D' }} />
            ))}
          </div>
        ) : nowPlaying.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {nowPlaying.map(movie => (
              <Link key={movie.tmdb_id} to="/whatsnew"
                className="relative rounded-lg overflow-hidden cursor-pointer"
                style={{ aspectRatio: '2/3', background: '#22252D', border: '1px solid #2C313A', display: 'block' }}
                onMouseEnter={() => setHoveredId(movie.tmdb_id)}
                onMouseLeave={() => setHoveredId(null)}>

                {movie.poster_url && (
                  <img src={movie.poster_url} alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{ transform: hoveredId === movie.tmdb_id ? 'scale(1.08)' : 'scale(1)' }} />
                )}

                {/* Hover overlay — title */}
                <div className="absolute inset-0 flex flex-col justify-end transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 55%)',
                    opacity: hoveredId === movie.tmdb_id ? 1 : 0,
                  }}>
                  <p className="text-[8px] font-bold text-white leading-tight px-1 pb-1 line-clamp-2">
                    {movie.title}
                  </p>
                </div>

                {/* Rating badge */}
                {movie.vote_average > 0 && (
                  <div className="absolute top-1 right-1 px-1 py-0.5 rounded"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}>
                    <span className="text-[7px] font-black" style={{ color: '#F5C518' }}>
                      ★{movie.vote_average}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: '#5a5f6e' }}>No data</p>
        )}

        {/* CTA */}
        <Link to="/whatsnew"
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-[11px] font-bold"
          style={{ background: 'rgba(229,9,20,0.08)', color: '#E50914', border: '1px solid rgba(229,9,20,0.15)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,9,20,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(229,9,20,0.08)'}>
          🎬 What's New
        </Link>
      </div>

      {/* Browse by mood */}
      <div className="card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5f6e' }}>Browse by Mood</p>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map(({ label, emoji }) => (
            <span key={label}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-default transition-colors"
              style={{ background: '#181A20', color: '#A0A4AE', border: '1px solid #2C313A' }}>
              {emoji} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Daily quote */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(229,9,20,0.06), rgba(229,9,20,0.02))', borderColor: 'rgba(229,9,20,0.15)' }}>
        <div className="flex gap-2 mb-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="#E50914" viewBox="0 0 24 24" style={{ opacity: 0.6 }}>
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
          </svg>
          <p className="text-xs leading-relaxed italic" style={{ color: '#A0A4AE' }}>"{todayQuote.text}"</p>
        </div>
        <p className="text-[10px] font-bold text-right" style={{ color: '#E50914', opacity: 0.7 }}>— {todayQuote.author}</p>
      </div>
    </aside>
  );
}


export function RightSidebar({ posts }) {
  const topPosts = [...(posts || [])].sort((a, b) => b.love_count - a.love_count).slice(0, 5);
  const hotPosts = [...(posts || [])].sort((a, b) => b.comment_count - a.comment_count).slice(0, 3);
  const rankColor = (i) => ['#F5C518', '#A0A4AE', '#cd7f32'][i] ?? '#2C313A';

  return (
    <aside className="space-y-3 sticky top-20 self-start">

      {/* ── Most Loved ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4" fill="#E50914" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A0A4AE' }}>Most Loved</p>
        </div>
        {topPosts.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: '#5a5f6e' }}>No posts yet</p>
        ) : (
          <div className="space-y-2.5">
            {topPosts.map((p, i) => (
              <Link key={p.post_id} to={`/feed/${p.post_id}`} className="flex items-start gap-2.5 group">
                <span className="text-xs font-black w-4 shrink-0 mt-0.5" style={{ color: rankColor(i) }}>{i + 1}</span>
                {p.poster_url && (
                  <img src={p.poster_url} alt="" className="w-7 h-10 object-cover rounded shrink-0" style={{ border: '1px solid #2C313A' }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate leading-tight group-hover:text-[#E50914] transition-colors" style={{ color: '#fff' }}>{p.media_title}</p>
                  <p className="text-[10px] truncate" style={{ color: '#5a5f6e' }}>{p.display_name || p.username}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="#E50914" viewBox="0 0 24 24">
                      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                    </svg>
                    <span className="text-[10px] font-bold" style={{ color: '#5a5f6e' }}>{p.love_count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Hot Discussion ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#F5C518" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A0A4AE' }}>Hot Discussion</p>
        </div>
        {hotPosts.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: '#5a5f6e' }}>No activity yet</p>
        ) : (
          <div className="space-y-2.5">
            {hotPosts.map((p) => (
              <Link key={p.post_id} to={`/feed/${p.post_id}`} className="flex items-center gap-2.5 group">
                {p.poster_url && (
                  <img src={p.poster_url} alt="" className="w-7 h-10 object-cover rounded shrink-0" style={{ border: '1px solid #2C313A' }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate group-hover:text-[#F5C518] transition-colors" style={{ color: '#fff' }}>{p.media_title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#F5C518" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                    </svg>
                    <span className="text-[10px] font-bold" style={{ color: '#5a5f6e' }}>{p.comment_count} comments</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Pro tip ── */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.08), rgba(245,197,24,0.03))', borderColor: 'rgba(245,197,24,0.15)' }}>
        <div className="flex items-start gap-2.5">
          <span className="text-xl">🍿</span>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#F5C518' }}>Pro Tip</p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#A0A4AE' }}>
              Rate movies after you finish them — your ratings help others discover great films!
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}


