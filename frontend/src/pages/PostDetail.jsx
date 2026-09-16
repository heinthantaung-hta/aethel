import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminBanControl from '../components/AdminBanControl';
import { api } from '../api/client';
import LoveButton from '../components/LoveButton';
import TimeAgo from '../components/TimeAgo';

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ url, name, size = 'md' }) {
  const initials = (name || '?').charAt(0).toUpperCase();
  const dim = { sm: 28, md: 32, lg: 40 }[size] || 32;
  const fs  = { sm: 9,  md: 11, lg: 14 }[size] || 11;
  return (
    <div style={{ width: dim, height: dim, borderRadius: '50%', overflow: 'hidden',
      border: '1px solid #2C313A', flexShrink: 0 }}>
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#E50914,#8b0000)', fontSize: fs }}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ── Star display ──────────────────────────────────────────────
function Stars({ rating }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className="w-4 h-4" fill={s <= rating ? '#F5C518' : 'none'}
          stroke={s <= rating ? 'none' : '#2C313A'} strokeWidth={1.5} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ── Three-dot owner menu ──────────────────────────────────────
function OwnerMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg transition-colors cursor-pointer"
        style={{ color: '#5a5f6e' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#2C313A'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#5a5f6e'; e.currentTarget.style.background = 'transparent'; }}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-2xl z-20 overflow-hidden animate-scale-in"
          style={{ background: '#22252D', border: '1px solid #2C313A' }}>
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer transition-colors"
            style={{ color: '#A0A4AE' }}
            onMouseEnter={e => e.currentTarget.style.background = '#181A20'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer transition-colors"
            style={{ color: '#E50914' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,9,20,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Single comment row ────────────────────────────────────────
function CommentRow({ comment, user, postId, depth = 0, onDeleted, onEdited, onReplyAdded }) {
  const [editing, setEditing]           = useState(false);
  const [editBody, setEditBody]         = useState(comment.body);
  const [saving, setSaving]             = useState(false);
  const [replying, setReplying]         = useState(false);
  const [replyBody, setReplyBody]       = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = user?.user_id === comment.user_id;

  const handleEdit = async () => {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      const updated = await api.editComment(comment.comment_id, editBody.trim());
      onEdited({ ...comment, body: updated.body });
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.deleteComment(comment.comment_id); onDeleted(comment.comment_id); }
    catch (e) { console.error(e); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSendingReply(true);
    try {
      const newReply = await api.addReply(postId, replyBody.trim(), comment.comment_id);
      onReplyAdded(newReply);
      setReplyBody(''); setReplying(false);
    } catch (e) { console.error(e); }
    finally { setSendingReply(false); }
  };

  return (
    <div className={depth > 0 ? 'ml-9 mt-2' : ''}>
      <div className="flex gap-3 group/comment">
        <Avatar url={comment.avatar_url} name={comment.display_name || comment.username} size={depth > 0 ? 'sm' : 'md'} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="rounded-xl px-4 py-3" style={{ background: '#181A20', border: '1px solid #2C313A' }}>
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                rows={2} autoFocus className="input resize-none w-full text-sm" style={{ background: '#22252D' }} />
              <div className="flex gap-2 mt-2">
                <button onClick={handleEdit} disabled={saving || !editBody.trim()} className="btn-primary text-xs py-1.5 px-3">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEditBody(comment.body); }} className="btn-secondary text-xs py-1.5 px-3">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-2.5" style={{ background: '#181A20', border: '1px solid #2C313A' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Link to={`/u/${comment.username}`}
                    className="text-xs font-bold text-white hover:text-[#E50914] transition-colors">
                    {comment.display_name || comment.username}
                  </Link>
                  <span className="text-[10px]" style={{ color: '#5a5f6e' }}>
                    <TimeAgo date={comment.created_at} />
                  </span>
                  {comment.updated_at && comment.updated_at !== comment.created_at && (
                    <span className="text-[10px]" style={{ color: '#5a5f6e' }}>(edited)</span>
                  )}
                </div>
                {isOwner && (
                  <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity">
                    <OwnerMenu
                      onEdit={() => { setEditing(true); setEditBody(comment.body); }}
                      onDelete={() => setConfirmDelete(true)}
                    />
                  </div>
                )}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#A0A4AE' }}>{comment.body}</p>
            </div>
          )}

          {!editing && depth < 2 && (
            <button onClick={() => setReplying(r => !r)}
              className="text-[11px] font-medium mt-1.5 ml-1 transition-colors cursor-pointer"
              style={{ color: '#5a5f6e' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
              onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
              {replying ? 'Cancel' : 'Reply'}
            </button>
          )}

          {confirmDelete && (
            <div className="mt-2 px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 animate-scale-in"
              style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)' }}>
              <p className="text-xs font-medium" style={{ color: '#E50914' }}>Delete this comment?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs rounded-lg cursor-pointer"
                  style={{ color: '#A0A4AE', background: '#22252D', border: '1px solid #2C313A' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} className="btn-primary text-xs py-1 px-2.5">Delete</button>
              </div>
            </div>
          )}

          {replying && (
            <form onSubmit={handleReply} className="mt-2 flex gap-2">
              <Avatar url={user?.avatar_url} name={user?.display_name || user?.username} size="sm" />
              <div className="flex-1 flex gap-2">
                <input type="text" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Reply to ${comment.display_name || comment.username}…`}
                  autoFocus className="input flex-1 text-sm py-2" style={{ background: '#22252D' }} />
                <button type="submit" disabled={!replyBody.trim() || sendingReply}
                  className="btn-primary px-3 py-2 text-xs">{sendingReply ? '…' : 'Send'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main PostDetail ───────────────────────────────────────────
export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost]         = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading]   = useState(true);
  const isAdmin = user?.role === 'admin';
  const [submitting, setSubmitting] = useState(false);

  const [editingPost, setEditingPost]     = useState(false);
  const [editTitle, setEditTitle]         = useState('');
  const [editBody, setEditBody]           = useState('');
  const [savingPost, setSavingPost]       = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);

  useEffect(() => { loadPost(); loadComments(); }, [id]);

  const loadPost = async () => {
    try { const p = await api.getPost(id); setPost(p); setEditTitle(p.title); setEditBody(p.body); }
    catch {} finally { setLoading(false); }
  };
  const loadComments = async () => {
    try { setComments(await api.getComments(id)); } catch {}
  };

  const handleLoveToggle = async () => {
    const result = await api.toggleLove(id);
    setPost(p => ({ ...p, loved_by_me: result.loved, love_count: result.love_count }));
  };

  const handleSavePost = async () => {
    setSavingPost(true);
    try {
      const updated = await api.editPost(id, { title: editTitle, body: editBody });
      setPost(p => ({ ...p, title: updated.title, body: updated.body }));
      setEditingPost(false);
    } catch (e) { console.error(e); }
    finally { setSavingPost(false); }
  };

  const handleDeletePost = async () => {
    try { await api.deletePost(id); navigate('/feed'); } catch (e) { console.error(e); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const c = await api.addComment(id, newComment.trim());
      setComments(prev => [...prev, c]);
      setPost(p => ({ ...p, comment_count: p.comment_count + 1 }));
      setNewComment('');
    } catch {} finally { setSubmitting(false); }
  };

  const handleCommentDeleted = (commentId) => {
    setComments(prev => prev.filter(c => c.comment_id !== commentId && c.parent_comment_id !== commentId));
    setPost(p => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
  };
  const handleCommentEdited = (updated) => {
    setComments(prev => prev.map(c => c.comment_id === updated.comment_id ? { ...c, body: updated.body } : c));
  };
  const handleReplyAdded = (reply) => {
    setComments(prev => [...prev, reply]);
    setPost(p => ({ ...p, comment_count: p.comment_count + 1 }));
  };

  const topLevel  = comments.filter(c => !c.parent_comment_id);
  const getReplies = (pid) => comments.filter(c => c.parent_comment_id === pid);
  const isPostOwner = user?.user_id === post?.user_id;

  if (loading) return (
    <div className="card p-8 animate-pulse text-center" style={{ color: '#5a5f6e' }}>Loading…</div>
  );
  if (!post) return (
    <div className="text-center py-16">
      <h2 className="text-lg font-semibold mb-2" style={{ color: '#A0A4AE' }}>Post not found</h2>
      <Link to="/feed" className="font-medium text-sm" style={{ color: '#E50914' }}>Back to Feed</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
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

      {/* ── Post hero ── */}
      <div className="card p-6 mb-4">

        {/* Poster + meta row */}
        <div className="flex gap-5 mb-5">
          {post.poster_url && (
            <div className="w-24 shrink-0 rounded-xl overflow-hidden self-start aspect-[2/3]"
              style={{ border: '1px solid #2C313A' }}>
              <img src={post.poster_url} alt={post.media_title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Author */}
            <div className="flex items-center justify-between mb-3">
              <Link to={`/u/${post.username}`} className="flex items-center gap-2.5 group/author">
                <Avatar url={post.avatar_url} name={post.display_name || post.username} size="md" />
                <div>
                  <p className="text-sm font-semibold text-white group-hover/author:text-[#E50914] transition-colors">
                    {post.display_name || post.username}
                  </p>
                  <p className="text-xs" style={{ color: '#5a5f6e' }}>@{post.username} · <TimeAgo date={post.created_at} /></p>
                </div>
              </Link>
              {isPostOwner && (
                <OwnerMenu
                  onEdit={() => { setEditingPost(true); setEditTitle(post.title); setEditBody(post.body); }}
                  onDelete={() => setConfirmDeletePost(true)}
                />
              )}
            </div>

            {/* Movie title + year */}
            <h1 className="text-xl font-bold text-white leading-snug">
              {post.media_title}
              {post.release_year && (
                <span className="ml-2 text-base font-normal" style={{ color: '#A0A4AE' }}>{post.release_year}</span>
              )}
            </h1>

            {/* Stars + interactions */}
            <div className="flex items-center gap-4 mt-2">
              {post.rating && <Stars rating={post.rating} />}
              {isAdmin && <AdminBanControl key={post.user_id} target={{ user_id: post.user_id, username: post.username, role: post.author_role, is_banned: post.author_is_banned }} />}
              {!isAdmin ? (
                <LoveButton loved={post.loved_by_me} count={post.love_count} onToggle={handleLoveToggle} compact />
              ) : (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#A0A4AE' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#E50914' }}>
                    <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                  </svg>
                  <span className="font-semibold">{post.love_count}</span>
                </span>
              )}
              <div className="flex items-center gap-1 text-xs" style={{ color: '#5a5f6e' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                <span className="font-semibold">{comments.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post title + body / edit mode */}
        {editingPost ? (
          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid #2C313A' }}>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              className="input w-full text-base font-bold" placeholder="Post title" />
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
              rows={5} className="input w-full resize-none text-[15px]" placeholder="Post body" />
            <div className="flex gap-2">
              <button onClick={handleSavePost} disabled={savingPost || !editTitle.trim() || !editBody.trim()}
                className="btn-primary text-sm py-2">{savingPost ? 'Saving…' : 'Save changes'}</button>
              <button onClick={() => setEditingPost(false)} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="pt-4" style={{ borderTop: '1px solid #2C313A' }}>
            <p className="text-sm font-bold text-white mb-2">{post.title}</p>
            <p className="leading-relaxed whitespace-pre-wrap text-[15px]" style={{ color: '#A0A4AE' }}>{post.body}</p>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDeletePost && (
          <div className="mt-4 px-4 py-3 rounded-xl flex items-center justify-between gap-3 animate-scale-in"
            style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)' }}>
            <p className="text-sm font-medium" style={{ color: '#E50914' }}>Delete this post permanently?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeletePost(false)}
                className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                style={{ color: '#A0A4AE', background: '#22252D', border: '1px solid #2C313A' }}>
                Cancel
              </button>
              <button onClick={handleDeletePost} className="btn-primary text-xs py-1.5 px-3">Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Comments ── */}
      <div className="card p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#A0A4AE' }}>
          Comments ({comments.length})
        </h2>

        {comments.length === 0 && (
          <p className="text-sm py-3 text-center" style={{ color: '#5a5f6e' }}>No comments yet. Start the discussion.</p>
        )}

        <div className="space-y-3 mb-5">
          {topLevel.map(c => (
            <div key={c.comment_id}>
              <CommentRow comment={c} user={user} postId={id} depth={0}
                onDeleted={handleCommentDeleted} onEdited={handleCommentEdited} onReplyAdded={handleReplyAdded} />
              {getReplies(c.comment_id).map(reply => (
                <CommentRow key={reply.comment_id} comment={reply} user={user} postId={id} depth={1}
                  onDeleted={handleCommentDeleted} onEdited={handleCommentEdited} onReplyAdded={handleReplyAdded} />
              ))}
            </div>
          ))}
        </div>

        {/* New comment input */}
        {!isAdmin ? (
          <form onSubmit={handleComment} className="flex gap-3">
            <Avatar url={user?.avatar_url} name={user?.display_name || user?.username} />
            <div className="flex-1 flex gap-2">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…" className="input flex-1"
                style={{ background: '#22252D' }} />
              <button type="submit" disabled={!newComment.trim() || submitting} className="btn-primary px-4">
                {submitting ? '…' : 'Send'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: '#5a5f6e' }}>Admin accounts cannot post comments.</p>
        )}
      </div>
    </div>
  );
}
