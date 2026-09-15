import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import MediaBadge from '../components/MediaBadge';
import TimeAgo from '../components/TimeAgo';

const POST_STATUS = {
  published: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)', label: 'Published' },
  flagged:   { color: '#F5C518', bg: 'rgba(245,197,24,0.12)',  border: 'rgba(245,197,24,0.25)', label: 'Flagged'   },
  removed:   { color: '#E50914', bg: 'rgba(229,9,20,0.10)',    border: 'rgba(229,9,20,0.25)',   label: 'Removed'   },
};

const ACTION_COLORS = {
  red:    { color: '#E50914', border: 'rgba(229,9,20,0.3)',   hoverBg: 'rgba(229,9,20,0.1)'  },
  amber:  { color: '#F5C518', border: 'rgba(245,197,24,0.3)', hoverBg: 'rgba(245,197,24,0.1)' },
  emerald:{ color: '#10b981', border: 'rgba(16,185,129,0.3)', hoverBg: 'rgba(16,185,129,0.1)' },
  gray:   { color: '#A0A4AE', border: '#2C313A',              hoverBg: '#181A20'              },
};

function ActionBtn({ label, color, onClick }) {
  const c = ACTION_COLORS[color] || ACTION_COLORS.gray;
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer"
      style={{ color: c.color, borderColor: c.border, background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {label}
    </button>
  );
}

function SkeletonRows({ n = 3 }) {
  return (
    <div className="space-y-2">
      {[...Array(n)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse" style={{ height: 64, background: '#22252D' }} />
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab]             = useState('posts');
  const [posts, setPosts]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]     = useState(true);
  const [confirmBan, setConfirmBan] = useState(null);

  if (user?.role !== 'admin') return <Navigate to="/feed" replace />;

  useEffect(() => {
    if (tab === 'posts') loadPosts(); else loadUsers();
  }, [tab, statusFilter]);

  const loadPosts = async () => {
    try { setLoading(true); setPosts(await api.adminGetPosts(statusFilter || undefined)); }
    catch {} finally { setLoading(false); }
  };
  const loadUsers = async () => {
    try { setLoading(true); setUsers(await api.adminGetUsers()); }
    catch {} finally { setLoading(false); }
  };

  const handlePostStatus = async (postId, status) => {
    await api.adminUpdatePostStatus(postId, status);
    setPosts((p) => p.map((x) => x.post_id === postId ? { ...x, status } : x));
  };
  const handleDeletePost = async (postId) => {
    if (!confirm('Permanently delete this post?')) return;
    await api.adminDeletePost(postId);
    setPosts((p) => p.filter((x) => x.post_id !== postId));
  };
  const handleBanToggle = async (userId, currentlyBanned) => {
    try {
      const result = await api.adminBanUser(userId, !currentlyBanned);
      setUsers((u) => u.map((x) => x.user_id === userId ? { ...x, is_banned: result.is_banned } : x));
    } catch (e) { console.error(e); }
    setConfirmBan(null);
  };

  const banCount     = users.filter(u => u.is_banned).length;
  const flaggedCount = posts.filter(p => p.status === 'flagged').length;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0A4AE' }}>Moderate content · Manage users</p>
        </div>
        <div className="flex gap-2">
          {flaggedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full"
              style={{ background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#F5C518' }} />
              {flaggedCount} flagged
            </span>
          )}
          {banCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full"
              style={{ background: 'rgba(229,9,20,0.1)', color: '#E50914', border: '1px solid rgba(229,9,20,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#E50914' }} />
              {banCount} banned
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-xl p-1 w-fit" style={{ background: '#22252D' }}>
        {['posts', 'users'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer capitalize"
            style={tab === t
              ? { background: '#2C313A', color: '#E50914' }
              : { color: '#A0A4AE', background: 'transparent' }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = '#A0A4AE'; }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── POSTS TAB ── */}
      {tab === 'posts' && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {[{ v: '', l: 'All' }, { v: 'published', l: 'Published' }, { v: 'flagged', l: 'Flagged' }, { v: 'removed', l: 'Removed' }].map(({ v, l }) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer"
                style={statusFilter === v
                  ? { background: 'rgba(229,9,20,0.1)', borderColor: 'rgba(229,9,20,0.3)', color: '#E50914' }
                  : { background: 'transparent', borderColor: '#2C313A', color: '#A0A4AE' }}
                onMouseEnter={e => { if (statusFilter !== v) { e.currentTarget.style.borderColor = 'rgba(229,9,20,0.3)'; e.currentTarget.style.color = '#E50914'; } }}
                onMouseLeave={e => { if (statusFilter !== v) { e.currentTarget.style.borderColor = '#2C313A'; e.currentTarget.style.color = '#A0A4AE'; } }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? <SkeletonRows n={3} /> : (
            <div className="space-y-2">
              {posts.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: '#A0A4AE' }}>No posts match this filter.</p>
              )}
              {posts.map((p) => {
                const st = POST_STATUS[p.status] || POST_STATUS.published;
                return (
                  <div key={p.post_id} className="card p-3.5 flex items-start gap-3">
                    {p.poster_url && (
                      <img src={p.poster_url} alt="" className="w-8 h-12 object-cover rounded-lg shrink-0"
                        style={{ border: '1px solid #2C313A' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                        <MediaBadge type={p.media_type} />
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      <p className="text-xs" style={{ color: '#5a5f6e' }}>
                        @{p.username} · ❤ {p.love_count} · 💬 {p.comment_count} · <TimeAgo date={p.created_at} />
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {p.status !== 'published' && <ActionBtn label="Restore" color="emerald" onClick={() => handlePostStatus(p.post_id, 'published')} />}
                      {p.status === 'published' && <ActionBtn label="Flag"    color="amber"   onClick={() => handlePostStatus(p.post_id, 'flagged')}   />}
                      {p.status !== 'removed'   && <ActionBtn label="Remove"  color="red"     onClick={() => handlePostStatus(p.post_id, 'removed')}   />}
                      <ActionBtn label="Delete" color="gray" onClick={() => handleDeletePost(p.post_id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        loading ? <SkeletonRows n={4} /> : (
          <div className="space-y-2">
            {users.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: '#A0A4AE' }}>No users found.</p>
            )}
            {users.map((u) => (
              <div key={u.user_id} className={`card p-3.5 flex items-center gap-3 ${u.is_banned ? 'opacity-60' : ''}`}>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                  style={{ border: '1px solid #2C313A' }}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs"
                      style={{ background: 'linear-gradient(135deg,#E50914,#8b0000)' }}>
                      {(u.display_name || u.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{u.display_name || u.username}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={u.role === 'admin'
                        ? { background: 'rgba(229,9,20,0.1)', color: '#E50914', border: '1px solid rgba(229,9,20,0.25)' }
                        : { background: '#22252D', color: '#A0A4AE', border: '1px solid #2C313A' }}>
                      {u.role}
                    </span>
                    {u.is_banned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(229,9,20,0.1)', color: '#E50914', border: '1px solid rgba(229,9,20,0.25)' }}>
                        Banned
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: '#5a5f6e' }}>
                    @{u.username} · {u.post_count} posts · {u.comment_count} comments
                  </p>
                </div>

                {/* Actions */}
                {u.user_id !== user.user_id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.is_banned ? (
                      <ActionBtn label="Unban" color="emerald" onClick={() => handleBanToggle(u.user_id, true)} />
                    ) : (
                      <ActionBtn label="Ban" color="red" onClick={() => setConfirmBan(u.user_id)} />
                    )}
                  </div>
                )}

                {/* Ban confirm */}
                {confirmBan === u.user_id && (
                  <div className="ml-1 flex items-center gap-1.5 animate-scale-in">
                    <span className="text-xs font-medium" style={{ color: '#A0A4AE' }}>Ban @{u.username}?</span>
                    <button onClick={() => handleBanToggle(u.user_id, false)}
                      className="btn-primary text-[11px] py-1 px-2.5">Yes</button>
                    <button onClick={() => setConfirmBan(null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors"
                      style={{ color: '#A0A4AE', background: '#22252D', border: '1px solid #2C313A' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2C313A'}
                      onMouseLeave={e => e.currentTarget.style.background = '#22252D'}>No</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
