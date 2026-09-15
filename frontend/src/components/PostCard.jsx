import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import LoveButton from './LoveButton';
import TimeAgo from './TimeAgo';
import ReportModal from './ReportModal';

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className="w-3 h-3" fill={s <= rating ? '#F5C518' : 'none'}
          stroke={s <= rating ? 'none' : '#2C313A'} strokeWidth={1.5} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function PostCard({ post, onLoveToggle, onDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const getInitials = (name) => (name || '?').charAt(0).toUpperCase();
  const isOwner = user?.user_id === post.user_id;

  const handleDelete = async () => {
    try { await api.deletePost(post.post_id); onDeleted?.(post.post_id); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        {/* Poster */}
        <Link to={`/feed/${post.post_id}`}
          className="shrink-0 w-14 rounded-xl overflow-hidden self-start"
          style={{ aspectRatio: '2/3', background: '#181A20', border: '1px solid #2C313A' }}>
          {post.poster_url ? (
            <img src={post.poster_url} alt={post.media_title}
              className="w-full h-full object-cover hover:opacity-85 transition-opacity" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: '#5a5f6e' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">

          {/* Row 1 — author + time + menu */}
          <div className="flex items-center justify-between">
            <Link to={`/u/${post.username}`} className="flex items-center gap-1.5 group/author">
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0"
                style={{ border: '1px solid #2C313A' }}>
                {post.avatar_url ? (
                  <img src={post.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #E50914, #c8070f)' }}>
                    <span className="text-[8px] font-bold text-white">{getInitials(post.display_name || post.username)}</span>
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold truncate max-w-[120px] transition-colors group-hover/author:text-[#E50914]"
                style={{ color: '#A0A4AE' }}>
                {post.display_name || post.username}
              </span>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <TimeAgo date={post.created_at} />
              {/* Three-dot menu — shown for owner (edit/delete) or other users (report) */}
              <div className="relative">
                <button onClick={() => setMenuOpen(o => !o)}
                  className="p-1 rounded-lg transition-colors cursor-pointer"
                  style={{ color: '#5a5f6e' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#A0A4AE'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-2xl z-20 overflow-hidden animate-scale-in"
                    style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                    {isOwner && (
                      <>
                        <button onClick={() => { navigate(`/feed/${post.post_id}`); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer transition-colors text-left"
                          style={{ color: '#A0A4AE' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#181A20'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                          Edit
                        </button>
                        <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer transition-colors text-left"
                          style={{ color: '#E50914' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,9,20,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Delete
                        </button>
                      </>
                    )}
                    {!isOwner && !isAdmin && (
                      <button onClick={() => { setReportOpen(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors text-left"
                        style={{ color: '#ef4444' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                        </svg>
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2 — movie title + year + stars */}
          <Link to={`/feed/${post.post_id}`} className="group/title">
            <p className="text-sm font-bold text-white group-hover/title:text-[#E50914] transition-colors leading-tight">
              {post.media_title}
              {post.release_year && <span className="ml-1.5 font-normal text-xs" style={{ color: '#A0A4AE' }}>{post.release_year}</span>}
              {post.rating && <span className="ml-2 align-middle"><Stars rating={post.rating} /></span>}
            </p>
          </Link>

          {/* Row 3 — post title + body */}
          <Link to={`/feed/${post.post_id}`} className="block group/body">
            <p className="text-xs font-semibold text-white group-hover/body:text-[#E50914] transition-colors">{post.title}</p>
            <p className="text-xs leading-relaxed line-clamp-2 mt-0.5" style={{ color: '#A0A4AE' }}>{post.body}</p>
          </Link>

          {/* Row 4 — action bar */}
          {!isAdmin && (
            <div className="flex items-center gap-0.5 pt-1 mt-0.5" style={{ borderTop: '1px solid #2C313A' }}>
              <LoveButton loved={post.loved_by_me} count={post.love_count} onToggle={() => onLoveToggle(post.post_id)} compact />
              <Link to={`/feed/${post.post_id}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors"
                style={{ color: '#5a5f6e' }}
                onMouseEnter={e => { e.currentTarget.style.color='#F5C518'; e.currentTarget.style.background='rgba(245,197,24,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color='#5a5f6e'; e.currentTarget.style.background='transparent'; }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                <span className="text-xs font-semibold tabular-nums">{post.comment_count}</span>
              </Link>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-3 pt-1 mt-0.5" style={{ borderTop: '1px solid #2C313A' }}>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#5a5f6e' }}>
                <svg className="w-3.5 h-3.5" fill="#E50914" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
                {post.love_count}
              </span>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#5a5f6e' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                {post.comment_count}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="mt-3 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 animate-scale-in"
          style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#E50914' }}>Delete this post?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 text-xs rounded-lg cursor-pointer font-semibold"
              style={{ background: '#22252D', border: '1px solid #2C313A', color: '#A0A4AE' }}>Cancel</button>
            <button onClick={handleDelete}
              className="px-3 py-1 text-xs rounded-lg cursor-pointer font-bold text-white"
              style={{ background: '#E50914' }}>Delete</button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          reportType="post"
          targetId={post.post_id}
          targetLabel={`"${post.media_title}" by @${post.username}`}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
