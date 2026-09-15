import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TimeAgo from '../components/TimeAgo';
import ReportModal from '../components/ReportModal';
import SecuritySettings from '../components/SecuritySettings';

// ── Cinema dark theme status pills ─────────────────────────────
const statusStyle = {
  'Completed':     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)', icon: '✓' },
  'Watching':      { color: '#F5C518', bg: 'rgba(245,197,24,0.12)',  border: 'rgba(245,197,24,0.25)', icon: '▶' },
  'Want to Watch': { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)', icon: '◷' },
};
const statusFilters = ['All', 'Completed', 'Watching', 'Want to Watch'];

const statConfig = [
  { label: 'Total Movies', key: 'total',       color: '#E50914', gradient: 'linear-gradient(135deg, rgba(229,9,20,0.15), rgba(229,9,20,0.05))', icon: '🎬' },
  { label: 'Watched',      key: 'completed',   color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', icon: '✅' },
  { label: 'Watching',     key: 'in_progress', color: '#F5C518', gradient: 'linear-gradient(135deg, rgba(245,197,24,0.15), rgba(245,197,24,0.05))', icon: '👀' },
  { label: 'Watchlist',    key: 'backlog',      color: '#60a5fa', gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))', icon: '📋' },
];

function StarRow({ rating }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-3 h-3" fill={i < rating ? '#F5C518' : '#2C313A'} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StatusPill({ status, size = 'sm' }) {
  const s = statusStyle[status];
  if (!s) return null;
  const px = size === 'xs' ? '4px 8px' : '3px 10px';
  const fs = size === 'xs' ? '9px' : '10px';
  return (
    <span style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: px, fontSize: fs, fontWeight: 700, borderRadius: 9999, letterSpacing: '0.02em' }}>
      {status === 'Want to Watch' ? 'Watchlist' : status}
    </span>
  );
}

function Avatar({ url, initials, size = 20, border = '#2C313A' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${border}`, flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#E50914,#8b0000)', fontSize: size * 0.35 }}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ── Rating Distribution Chart ──────────────────────────────────
function RatingDistribution({ movies }) {
  const dist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1-5 stars
    movies.forEach(m => {
      if (m.rating >= 1 && m.rating <= 5) counts[m.rating - 1]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((count, i) => ({ stars: i + 1, count, pct: (count / max) * 100 }));
  }, [movies]);

  return (
    <div className="space-y-1.5">
      {dist.map(d => (
        <div key={d.stars} className="flex items-center gap-2">
          <span className="text-[11px] font-bold w-4 text-right" style={{ color: '#F5C518' }}>{d.stars}</span>
          <svg className="w-3 h-3 shrink-0" fill="#F5C518" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#1A1D24' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${d.pct}%`,
                background: 'linear-gradient(90deg, #F5C518, #ff9800)',
                boxShadow: d.pct > 0 ? '0 0 8px rgba(245,197,24,0.3)' : 'none',
              }} />
          </div>
          <span className="text-[11px] font-semibold w-5" style={{ color: '#5a5f6e' }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Favorite Genres Tags ───────────────────────────────────────
function FavoriteGenres({ movies }) {
  const genreCounts = useMemo(() => {
    const counts = {};
    movies.forEach(m => {
      (m.genres || []).forEach(g => {
        if (g.genre_name) counts[g.genre_name] = (counts[g.genre_name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [movies]);

  const genreColors = {
    'Action': '#ef4444', 'Comedy': '#f59e0b', 'Drama': '#8b5cf6', 'Horror': '#dc2626',
    'Sci-Fi': '#06b6d4', 'Romance': '#ec4899', 'Thriller': '#f97316', 'Animation': '#22c55e',
    'Adventure': '#14b8a6', 'Fantasy': '#a855f7', 'Crime': '#64748b', 'Mystery': '#6366f1',
    'Music': '#e879f9', 'Western': '#ca8a04', 'War': '#71717a', 'Family': '#fb923c',
    'History': '#a3a3a3', 'Documentary': '#38bdf8',
  };

  if (genreCounts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {genreCounts.map(([name, count]) => {
        const color = genreColors[name] || '#A0A4AE';
        return (
          <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-transform hover:scale-105"
            style={{
              background: `${color}15`,
              color: color,
              border: `1px solid ${color}30`,
            }}>
            {name}
            <span className="text-[9px] font-medium opacity-60">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

// Compact post card
function ProfilePostCard({ post }) {
  return (
    <Link to={`/feed/${post.post_id}`}
      className="flex gap-3 p-3 rounded-xl transition-colors group"
      style={{ ':hover': { background: '#181A20' } }}
      onMouseEnter={e => e.currentTarget.style.background = '#181A20'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div className="w-10 shrink-0 rounded-lg overflow-hidden self-start aspect-[2/3]"
        style={{ background: '#22252D', border: '1px solid #2C313A' }}>
        {post.poster_url ? (
          <img src={post.poster_url} alt={post.media_title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-[#E50914] transition-colors leading-snug">
          {post.media_title}
          {post.release_year && <span className="ml-1.5 font-normal text-xs" style={{ color: '#5a5f6e' }}>{post.release_year}</span>}
        </p>
        {post.rating && <div className="mt-0.5"><StarRow rating={post.rating} /></div>}
        <p className="text-xs font-semibold mt-1" style={{ color: '#A0A4AE' }}>{post.title}</p>
        <p className="text-xs leading-relaxed line-clamp-2 mt-0.5" style={{ color: '#5a5f6e' }}>{post.body}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: '#5a5f6e' }}>
          <TimeAgo date={post.created_at} />
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {post.love_count}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            {post.comment_count}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────
function EditProfileModal({ me, onClose, onSaved }) {
  const { updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ display_name: me?.display_name || '', username: me?.username || '', bio: me?.bio || '' });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (f, v) => { setForm(p => ({ ...p, [f]: v })); setError(''); setSuccess(''); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.username || form.username.trim().length < 3) return setError('Username must be at least 3 characters.');
    try {
      setLoading(true);
      const updated = await api.updateProfile({ display_name: form.display_name, username: form.username, bio: form.bio });
      updateUser(updated);
      setSuccess('Saved!');
      onSaved(updated);
    } catch (err) { setError(err.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('Image must be under 5MB.');
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      setAvatarLoading(true);
      const updated = await api.uploadAvatar(formData);
      updateUser(updated);
      onSaved(updated);
    } catch (err) { setError(err.data?.message || err.message); }
    finally { setAvatarLoading(false); e.target.value = ''; }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarLoading(true);
      const updated = await api.deleteAvatar();
      updateUser(updated);
      onSaved(updated);
    } catch (err) { setError(err.data?.message || err.message); }
    finally { setAvatarLoading(false); }
  };

  const initials = (me?.display_name || me?.username || '?').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl animate-scale-in"
        style={{ background: '#22252D', border: '1px solid #2C313A', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #2C313A' }}>
          <h2 className="text-base font-bold text-white">Edit Profile</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: '#2C313A', color: '#A0A4AE' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#353944'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2C313A'; e.currentTarget.style.color = '#A0A4AE'; }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Avatar picker */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarLoading}
                className="relative shrink-0 cursor-pointer" style={{ borderRadius: '50%' }}>
                <Avatar url={me?.avatar_url} initials={initials} size={64} border="rgba(229,9,20,0.4)" />
                <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
            <div>
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarLoading}
                className="text-sm font-semibold cursor-pointer transition-colors block" style={{ color: '#E50914' }}>
                {avatarLoading ? 'Uploading…' : 'Change photo'}
              </button>
              {me?.avatar_url && (
                <button onClick={handleRemoveAvatar} disabled={avatarLoading}
                  className="text-xs font-medium mt-1 cursor-pointer transition-colors block" style={{ color: '#5a5f6e' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Feedback */}
          {error && <p className="text-sm font-medium px-3 py-2 rounded-xl" style={{ color: '#E50914', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>{error}</p>}
          {success && <p className="text-sm font-medium px-3 py-2 rounded-xl" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>✓ {success}</p>}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#A0A4AE' }}>Display Name</label>
              <input type="text" value={form.display_name} onChange={(e) => handleChange('display_name', e.target.value)}
                placeholder="Your display name" className="input" maxLength={100} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#A0A4AE' }}>Username</label>
              <input type="text" value={form.username} onChange={(e) => handleChange('username', e.target.value)}
                placeholder="your_username" className="input" maxLength={50} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#A0A4AE' }}>Bio</label>
              <textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell people about yourself" className="input resize-none" rows={3} maxLength={300} />
              <p className="text-[11px] mt-1 text-right" style={{ color: '#5a5f6e' }}>{form.bio.length}/300</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main UserProfile ───────────────────────────────────────────
export default function UserProfile() {
  const { username } = useParams();
  const { user: me, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [filter, setFilter]     = useState('All');
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('grid');
  const [tab, setTab]           = useState('collection');

  const isOwnProfile = me?.username === username;

  useEffect(() => {
    setLoading(true); setError(null);
    api.getPublicProfile(username)
      .then(setData)
      .catch((err) => setError(err.message || 'User not found.'))
      .finally(() => setLoading(false));
  }, [username]);

  const handleSaved = (updated) => {
    if (updated.username && updated.username !== username) {
      navigate(`/u/${updated.username}`, { replace: true });
    } else {
      api.getPublicProfile(updated.username || username).then(setData).catch(() => {});
    }
  };

  // Compute derived stats
  const derivedStats = useMemo(() => {
    if (!data) return {};
    const { movies } = data;
    const rated = movies.filter(m => m.rating >= 1);
    const avgRating = rated.length > 0 ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1) : '—';
    const estHours = movies.filter(m => m.completion_status === 'Completed').length * 2; // ~2h per movie
    return { avgRating, estHours, ratedCount: rated.length };
  }, [data]);

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Banner skeleton */}
      <div className="rounded-2xl animate-pulse" style={{ height: 200, background: 'linear-gradient(135deg, #1A1D24, #22252D)' }} />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-2.5 rounded mb-2" style={{ background: '#22252D', width: '64px' }} />
            <div className="h-7 rounded" style={{ background: '#22252D', width: '40px' }} />
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="card p-12 text-center animate-fade-in max-w-3xl mx-auto">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#22252D' }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-white mb-1">User not found</h2>
      <p className="text-sm mb-5" style={{ color: '#A0A4AE' }}>@{username} doesn't exist or has been removed.</p>
      <Link to="/feed" className="btn-primary">Back to Feed</Link>
    </div>
  );

  const { user, stats, movies, posts = [] } = data;
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const initials = (user.display_name || user.username || '?').charAt(0).toUpperCase();

  const filteredMovies = movies.filter(m => {
    const matchStatus = filter === 'All' || m.completion_status === filter;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Get top 4 posters for banner background
  const bannerPosters = movies.filter(m => m.poster_url).slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">

      {editOpen && <EditProfileModal me={me} onClose={() => setEditOpen(false)} onSaved={handleSaved} />}
      {reportOpen && (
        <ReportModal
          reportType="user"
          targetId={user.user_id}
          targetLabel={`@${user.username}`}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* ── Cinematic Profile Hero ── */}
      <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid #2C313A' }}>
        {/* Banner background with movie posters */}
        <div className="relative h-36 overflow-hidden">
          <div className="absolute inset-0 flex">
            {bannerPosters.map((m, i) => (
              <div key={i} className="flex-1 h-full overflow-hidden" style={{ opacity: 0.3 }}>
                <img src={m.poster_url} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(1px)' }} />
              </div>
            ))}
            {bannerPosters.length === 0 && (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a0a0a, #0a0a1a)' }} />
            )}
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(14,17,22,0.3) 0%, rgba(14,17,22,0.7) 50%, #0E1116 100%)',
          }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(90deg, rgba(229,9,20,0.08) 0%, transparent 50%, rgba(96,165,250,0.05) 100%)',
          }} />
        </div>

        {/* Profile info overlay */}
        <div className="relative px-6 pb-5" style={{ marginTop: '-50px' }}>
          <div className="flex items-end gap-4">
            <Avatar url={user.avatar_url} initials={initials} size={96} border="rgba(229,9,20,0.5)" />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-white leading-tight">{user.display_name || user.username}</h1>
                  <p className="text-sm font-medium" style={{ color: '#A0A4AE' }}>@{user.username}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {user.role === 'admin' && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(229,9,20,0.15)', color: '#E50914', border: '1px solid rgba(229,9,20,0.3)' }}>
                      Admin
                    </span>
                  )}
                  {isOwnProfile && (
                    <button onClick={() => setEditOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                      style={{ border: '1px solid #2C313A', color: '#A0A4AE', background: 'rgba(34,37,45,0.8)', backdropFilter: 'blur(8px)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(229,9,20,0.4)'; e.currentTarget.style.color = '#E50914'; e.currentTarget.style.background = 'rgba(229,9,20,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2C313A'; e.currentTarget.style.color = '#A0A4AE'; e.currentTarget.style.background = 'rgba(34,37,45,0.8)'; }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                  {!isOwnProfile && (
                    <button onClick={() => setReportOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      style={{ border: '1px solid #2C313A', color: '#5a5f6e', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2C313A'; e.currentTarget.style.color = '#5a5f6e'; e.currentTarget.style.background = 'transparent'; }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                      </svg>
                      Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {user.bio && <p className="text-sm mt-3 leading-relaxed" style={{ color: '#A0A4AE' }}>{user.bio}</p>}

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs flex items-center gap-1.5" style={{ color: '#5a5f6e' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
              Member since {memberSince}
            </p>
            {isOwnProfile && (
              <button onClick={logout}
                className="text-xs font-medium cursor-pointer transition-colors"
                style={{ color: '#5a5f6e' }}
                onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                Log out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statConfig.map((card, i) => (
          <div key={card.label} className="rounded-xl p-4 transition-transform hover:scale-[1.02]"
            style={{
              background: card.gradient,
              border: `1px solid ${card.color}20`,
              animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
            }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#A0A4AE' }}>{card.label}</p>
              <span className="text-sm">{card.icon}</span>
            </div>
            <p className="text-2xl font-black" style={{ color: card.color }}>{stats[card.key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* ── Insights Panel ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Rating Distribution */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">⭐</span>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#A0A4AE' }}>Rating Distribution</h3>
          </div>
          <RatingDistribution movies={movies} />
          <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #2C313A' }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5a5f6e' }}>Avg Rating</p>
              <p className="text-lg font-black" style={{ color: '#F5C518' }}>{derivedStats.avgRating}</p>
            </div>
            <div style={{ width: 1, height: 28, background: '#2C313A' }} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5a5f6e' }}>Films Rated</p>
              <p className="text-lg font-black text-white">{derivedStats.ratedCount}</p>
            </div>
            <div style={{ width: 1, height: 28, background: '#2C313A' }} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5a5f6e' }}>Est. Hours</p>
              <p className="text-lg font-black" style={{ color: '#60a5fa' }}>{derivedStats.estHours}h</p>
            </div>
          </div>
        </div>

        {/* Favorite Genres */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🎭</span>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#A0A4AE' }}>Favorite Genres</h3>
          </div>
          <FavoriteGenres movies={movies} />
          {movies.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: '#5a5f6e' }}>Add movies to see your genre breakdown</p>
          )}

          {/* Top-rated movie highlight */}
          {movies.filter(m => m.rating === 5).length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2C313A' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#5a5f6e' }}>
                ★ Perfect Scores ({movies.filter(m => m.rating === 5).length})
              </p>
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {movies.filter(m => m.rating === 5).slice(0, 6).map(m => (
                  <div key={m.item_id} className="w-9 h-14 rounded-lg overflow-hidden shrink-0 transition-transform hover:scale-110"
                    style={{ border: '1px solid rgba(245,197,24,0.3)' }} title={m.title}>
                    {m.poster_url ? (
                      <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-center p-0.5" style={{ background: '#22252D', color: '#5a5f6e' }}>{m.title}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#22252D' }}>
        {[
          { key: 'collection', label: `Collection (${movies.length})` },
          { key: 'posts',      label: `Posts (${posts.length})` },
          ...(isOwnProfile ? [{ key: 'security', label: '🔒 Security' }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={tab === t.key
              ? { background: '#2C313A', color: '#E50914' }
              : { color: '#A0A4AE', background: 'transparent' }}
            onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.color = '#A0A4AE'; }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Collection tab ── */}
      {tab === 'collection' && (
        <div className="card p-4">
          {/* Filters + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {statusFilters.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer"
                  style={filter === f
                    ? { background: '#E50914', color: '#fff', borderColor: '#E50914' }
                    : { background: 'transparent', color: '#A0A4AE', borderColor: '#2C313A' }}
                  onMouseEnter={e => { if (filter !== f) { e.currentTarget.style.borderColor = 'rgba(229,9,20,0.4)'; e.currentTarget.style.color = '#E50914'; } }}
                  onMouseLeave={e => { if (filter !== f) { e.currentTarget.style.borderColor = '#2C313A'; e.currentTarget.style.color = '#A0A4AE'; } }}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
                  className="input py-1.5 text-sm w-36" style={{ paddingLeft: '2.25rem' }} />
              </div>
              {/* Grid / List toggle */}
              <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: '#22252D' }}>
                {['grid', 'list'].map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className="p-1.5 rounded-md transition-all cursor-pointer"
                    style={view === v ? { background: '#2C313A', color: '#E50914' } : { color: '#5a5f6e' }}
                    onMouseEnter={e => { if (view !== v) e.currentTarget.style.color = '#A0A4AE'; }}
                    onMouseLeave={e => { if (view !== v) e.currentTarget.style.color = '#5a5f6e'; }}>
                    {v === 'grid' ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredMovies.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#A0A4AE' }}>
              {search ? 'No movies match your search.' : filter !== 'All' ? `No movies with "${filter}" status.` : 'No movies in collection yet.'}
            </p>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredMovies.map(m => (
                <div key={m.item_id} className="group relative">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden" style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                    {m.poster_url ? (
                      <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {m.completion_status && (
                    <span className="absolute top-1.5 left-1.5">
                      <StatusPill status={m.completion_status} size="xs" />
                    </span>
                  )}
                  <p className="text-xs font-semibold text-white mt-1.5 truncate">{m.title}</p>
                  {m.rating && <div className="mt-0.5"><StarRow rating={m.rating} /></div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMovies.map(m => (
                <div key={m.item_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-colors group"
                  onMouseEnter={e => e.currentTarget.style.background = '#181A20'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                    {m.poster_url ? (
                      <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.release_year && <span className="text-[11px]" style={{ color: '#5a5f6e' }}>{m.release_year}</span>}
                      {m.completion_status && <StatusPill status={m.completion_status} size="xs" />}
                    </div>
                    {m.rating && <div className="mt-0.5"><StarRow rating={m.rating} /></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Posts tab ── */}
      {tab === 'posts' && (
        <div className="card" style={{ borderColor: '#2C313A' }}>
          {posts.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: '#A0A4AE' }}>
              {isOwnProfile ? "You haven't posted anything yet." : `@${user.username} hasn't posted anything yet.`}
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: '#2C313A' }}>
              {posts.map(p => <ProfilePostCard key={p.post_id} post={p} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Security tab (own profile only) ── */}
      {tab === 'security' && isOwnProfile && (
        <div className="space-y-4">
          <SecuritySettings />

          {/* Email verification status */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Email Verification</h3>
                <p className="text-[11px]" style={{ color: '#5a5f6e' }}>{me?.email}</p>
              </div>
              <div className="ml-auto">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  ✓ Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
