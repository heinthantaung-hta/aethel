import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import TimeAgo from '../components/TimeAgo';
import { Badge, AdminAction as Action, AdminConfirmation } from '../components/AdminControls';
import AdminReportCard from '../components/AdminReportCard';
import AdminBanControl from '../components/AdminBanControl';
import { adminStats, filterAdminItems, paginate } from '../utils/admin';

const FILTERS = { reports: ['pending', 'reviewed', 'resolved', 'dismissed'], posts: ['published', 'flagged', 'removed'], users: ['active', 'banned'] };

export default function AdminPanel() {
  const { user } = useAuth();
  const [data, setData] = useState({ posts: [], users: [], reports: [] });
  const [tab, setTab] = useState('reports');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const actionLock = useRef(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    try {
      const [posts, users, reports] = await Promise.all([api.adminGetPosts(), api.adminGetUsers(), api.adminGetReports()]);
      if (version === requestVersion.current) setData({ posts, users, reports });
    } catch (error) {
      if (version === requestVersion.current) setLoadError(error.message || 'Unable to load the admin panel.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') load();
    return () => { requestVersion.current += 1; };
  }, [user?.role, load]);

  const runAction = async (action, message) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setConfirmation(null);
      setFeedback({ type: 'success', message });
      await load();
    } catch (error) {
      setConfirmation(null);
      setFeedback({ type: 'error', message: error.message || 'The action failed. Please try again.' });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const changeTab = (next, filter = '') => { setTab(next); setStatus(filter); setSearch(''); setPage(1); };
  if (user?.role !== 'admin') return <Navigate to="/feed" replace />;
  const stats = adminStats(data);
  const filtered = filterAdminItems(data[tab], tab, search, status);
  const result = paginate(filtered, page);
  const disabled = busy || loading || Boolean(loadError);
  const cards = [
    { name: 'Total users', value: stats.users, tab: 'users', filter: '', color: 'text-white' },
    { name: 'Published posts', value: stats.published, tab: 'posts', filter: 'published', color: 'text-emerald-300' },
    { name: 'Flagged posts', value: stats.flagged, tab: 'posts', filter: 'flagged', color: 'text-amber-300' },
    { name: 'Pending reports', value: stats.pending, tab: 'reports', filter: 'pending', color: 'text-red-300' },
  ];

  return <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs uppercase tracking-[0.2em] text-red-400 mb-2">Community management</p>
        <h1 className="text-2xl font-bold">Admin Panel</h1><p className="text-sm text-gray-400 mt-1">Review reports, moderate content, and manage your community.</p></div>
      <Action disabled={busy || loading} onClick={load}>{loading ? 'Refreshing…' : 'Refresh'}</Action>
    </header>
    <section aria-label="Community overview" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => <button key={card.name} onClick={() => changeTab(card.tab, card.filter)} className="card p-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-red-400">
        <span className="text-xs text-gray-400">{card.name}</span><span className={`block text-3xl font-bold mt-2 ${card.color}`}>{loading || loadError ? '—' : card.value}</span>
        <span className="block text-xs text-gray-400 mt-2">View {card.tab} →</span>
      </button>)}
    </section>
    {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${feedback.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>{feedback.message}</div>}
    {busy && <p role="status" className="text-sm text-gray-300">Saving moderation action…</p>}
    {loadError && <div role="alert" className="card p-4 space-y-3"><p className="text-sm text-red-300">Could not refresh admin data: {loadError}</p><Action disabled={busy} onClick={load}>Retry loading</Action></div>}
    <section className="space-y-4" aria-label="Moderation workspace">
      <nav aria-label="Admin sections" className="flex gap-1 border-b border-[#2C313A]">
        {['reports', 'posts', 'users'].map(value => <button key={value} aria-current={tab === value ? 'page' : undefined}
          onClick={() => changeTab(value, value === 'reports' ? 'pending' : '')}
          className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 cursor-pointer ${tab === value ? 'text-red-400 border-red-500' : 'text-gray-400 border-transparent'}`}>{value}</button>)}
      </nav>
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 text-xs text-gray-400">Search {tab}
          <input type="search" className="input mt-1" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={tab === 'users' ? 'Username, name, or email…' : tab === 'reports' ? 'Reason, reporter, or reported content…' : 'Title, movie, or author…'} />
        </label>
        <label className="text-xs text-gray-400 sm:w-48">Status
          <select className="input mt-1 capitalize" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>{FILTERS[tab].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {!loading && !loadError && <p className="text-xs text-gray-400" role="status">{filtered.length} {tab} found{search || status ? ' with these filters' : ''}</p>}
      {loading && <div role="status" className="card p-8 text-center text-gray-400">Loading community data…</div>}
      {!loading && !loadError && result.items.length === 0 && <div className="card text-center p-10">
        <h2 className="font-semibold">{tab === 'reports' && status === 'pending' && !search ? 'No pending reports' : `No ${tab} found`}</h2>
        <p className="text-sm text-gray-400 mt-2">{search || status ? 'Try another search or view all statuses.' : 'New activity will appear here.'}</p>
        {(search || status) && <button className="btn-secondary mt-4" onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>Clear filters</button>}
      </div>}
      <div className="space-y-3" hidden={Boolean(loadError)} aria-busy={loading || busy}>
        {result.items.map(item => tab === 'reports'
          ? <AdminReportCard key={`report-${item.report_id}`} report={item} busy={disabled} runAction={runAction} confirmAction={setConfirmation} />
          : tab === 'posts' ? <article key={`post-${item.post_id}`} className="card p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Badge value={item.status} /><span className="text-xs text-gray-400">@{item.username} · <TimeAgo date={item.created_at} /></span></div>
            <div className="flex items-start gap-4">
              {item.poster_url && <img src={item.poster_url} alt={`${item.media_title || item.title} poster`} loading="lazy"
                className="w-16 h-24 rounded-lg object-cover shrink-0 bg-[#181A20] text-xs text-gray-400" />}
              <div className="min-w-0">
                <h3 className="font-semibold break-words">{item.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.media_title}</p>
              </div>
            </div>
            <AdminBanControl target={{ user_id: item.user_id, username: item.username, role: item.author_role, is_banned: item.author_is_banned }} onChanged={load} />
            <p className="text-xs text-gray-400">{item.media_title} · {item.love_count} likes · {item.comment_count} comments</p>
            <details className="text-sm"><summary className="cursor-pointer text-gray-300">Read full post</summary><p className="mt-3 text-gray-300 whitespace-pre-wrap break-words">{item.body || 'No text content.'}</p></details>
            <div className="flex flex-wrap gap-2">
              {item.status !== 'published' && <Action disabled={disabled} onClick={() => runAction(() => api.adminUpdatePostStatus(item.post_id, 'published'), 'Post restored.')}>Restore</Action>}
              {item.status === 'published' && <Action disabled={disabled} onClick={() => runAction(() => api.adminUpdatePostStatus(item.post_id, 'flagged'), 'Post flagged.')}>Flag</Action>}
              {item.status !== 'removed' && <Action disabled={disabled} danger onClick={() => runAction(() => api.adminUpdatePostStatus(item.post_id, 'removed'), 'Post removed from the feed.')}>Remove</Action>}
              <Action disabled={disabled} danger onClick={() => setConfirmation({ title: 'Permanently delete post?', detail: `“${item.title}” and its comments will be permanently deleted. This cannot be undone.`, action: () => api.adminDeletePost(item.post_id), message: 'Post permanently deleted.' })}>Delete permanently</Action>
            </div>
          </article> : <article key={`user-${item.user_id}`} className="card p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-2"><h3 className="font-semibold break-words">{item.display_name || item.username}</h3>
              <p className="text-xs text-gray-400 break-all">@{item.username} · {item.email}</p>
              <div className="flex flex-wrap gap-2"><Badge value={item.role} /><Badge value={item.is_banned ? 'banned' : 'active'} /></div>
              <p className="text-xs text-gray-400">{item.post_count} posts · {item.comment_count} comments · Joined <TimeAgo date={item.created_at} /></p>
            </div>
            {item.user_id !== user.user_id && item.role !== 'admin' && <Action disabled={disabled} danger={!item.is_banned} onClick={() => setConfirmation({
              title: `${item.is_banned ? 'Unban' : 'Ban'} @${item.username}?`, detail: item.is_banned ? 'This will restore their access.' : 'This user will lose access until an administrator unbans them.',
              action: () => api.adminBanUser(item.user_id, !item.is_banned), message: `User ${item.is_banned ? 'unbanned' : 'banned'}.`,
            })}>{item.is_banned ? 'Unban user' : 'Ban user'}</Action>}
          </article>)}
      </div>
      {!loading && !loadError && result.pages > 1 && <nav aria-label="Results pages" className="flex items-center justify-between gap-3">
        <Action disabled={result.page === 1 || busy} onClick={() => setPage(result.page - 1)}>Previous</Action>
        <span className="text-xs text-gray-400">Page {result.page} of {result.pages}</span>
        <Action disabled={result.page === result.pages || busy} onClick={() => setPage(result.page + 1)}>Next</Action>
      </nav>}
    </section>
    {confirmation && <AdminConfirmation confirmation={confirmation} busy={busy} onCancel={() => setConfirmation(null)} onConfirm={() => runAction(confirmation.action, confirmation.message)} />}
  </div>;
}
