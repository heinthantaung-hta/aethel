import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { filterCollection } from '../utils/collection';

const STATUSES = ['Want to Watch', 'Watching', 'Completed'];

const statusStyle = {
  'Completed':     { pill: 'border', dot: '', pillColor: '#10b981', pillBg: 'rgba(16,185,129,0.12)', dotColor: '#10b981', borderColor: 'rgba(16,185,129,0.25)' },
  'Watching':      { pill: 'border', dot: '', pillColor: '#F5C518', pillBg: 'rgba(245,197,24,0.12)',  dotColor: '#F5C518', borderColor: 'rgba(245,197,24,0.25)'  },
  'Want to Watch': { pill: 'border', dot: '', pillColor: '#3b82f6', pillBg: 'rgba(59,130,246,0.12)', dotColor: '#3b82f6', borderColor: 'rgba(59,130,246,0.25)'  },
};

// Inline status dropdown for a single row
function StatusBadge({ item, onUpdated, onError }) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);

  const handleChange = async (newStatus) => {
    if (newStatus === item.completion_status) { setOpen(false); return; }
    setSaving(true);
    onError(null);
    try {
      const updated = await api.updateStatus(item.item_id, newStatus);
      onUpdated(item.item_id, { completion_status: updated.completion_status, rating: updated.rating ?? null });
    } catch (e) { onError(`Could not update "${item.title}": ${e.message}`); }
    finally { setSaving(false); setOpen(false); }
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        title="Change status"
        aria-label={`Change status for ${item.title}: ${item.completion_status}`}
        aria-expanded={open}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-all"
        style={{
          color: statusStyle[item.completion_status].pillColor,
          background: statusStyle[item.completion_status].pillBg,
          borderColor: statusStyle[item.completion_status].borderColor,
          opacity: saving ? 0.6 : 1,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusStyle[item.completion_status].dotColor }} />
        {saving ? '…' : item.completion_status}
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl shadow-2xl z-30 overflow-hidden animate-scale-in"
          style={{ background: '#22252D', border: '1px solid #2C313A' }}>
          {STATUSES.map((s) => {
            const st = statusStyle[s];
            const active = s === item.completion_status;
            return (
              <button key={s} onClick={() => handleChange(s)} disabled={saving}
                onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-colors cursor-pointer"
                style={{ color: active ? '#fff' : '#A0A4AE', background: active ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = active ? 'rgba(255,255,255,0.05)' : 'transparent'}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dotColor }} />
                {s}
                {active && (
                  <svg className="w-3.5 h-3.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline star rating — only shown for Completed items
function InlineRating({ item, onUpdated, onError }) {
  const [hover, setHover]   = useState(0);
  const [saving, setSaving] = useState(false);

  const handleRate = async (star) => {
    if (saving) return;
    setSaving(true);
    onError(null);
    try {
      const updated = await api.updateRating(item.item_id, star);
      onUpdated(item.item_id, { rating: updated.rating });
    } catch (e) { onError(`Could not rate "${item.title}": ${e.message}`); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-0.5" title="Rate this movie">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          aria-label={`Rate ${item.title} ${s} ${s === 1 ? 'star' : 'stars'}`}
          aria-pressed={item.rating === s}
          onClick={() => handleRate(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          disabled={saving}
          className={`transition-transform hover:scale-110 cursor-pointer disabled:opacity-50 ${saving ? 'cursor-not-allowed' : ''}`}
        >
          <svg className={`w-4 h-4 transition-colors`} fill={s <= (hover || item.rating || 0) ? '#F5C518' : 'none'}
            stroke={s <= (hover || item.rating || 0) ? 'none' : '#2C313A'} strokeWidth={1.5} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {!item.rating && (
            <span className="ml-1 text-[10px]" style={{ color: '#5a5f6e' }}>Rate</span>
      )}
    </div>
  );
}

// ── Main RecentFeed ───────────────────────────────────────────
export default function RecentFeed({ items, loading, onDelete, onUpdated }) {
  const [search, setSearch]   = useState('');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const handleDelete = async (itemId) => {
    setDeleting(itemId);
    setError(null);
    try {
      await api.delete(itemId);
      setConfirmId(null);
      onDelete?.(itemId);
    } catch (err) { setError(`Could not remove movie: ${err.message}`); }
    finally { setDeleting(null); }
  };

  const genres = [...new Set(items.flatMap(item => (item.genres || []).map(g => g.genre_name)))].sort();
  const filtered = filterCollection(items, { search, status, genre, sort });
  const hasFilters = Boolean(search || status || genre);
  const clearFilters = () => { setSearch(''); setStatus(''); setGenre(''); };

  return (
    <div className="card p-5 animate-slide-up">
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">My Collection</h2>
          <p className="text-xs mt-0.5" style={{ color: '#5a5f6e' }}>Click the status badge to update it</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Search by title..." value={search}
            aria-label="Search collection by title"
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full sm:w-56 text-sm" style={{ background: '#22252D', paddingLeft: '2.25rem' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <label className="text-xs text-gray-400">Watch status
          <select className="input mt-1" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-400">Genre
          <select className="input mt-1" value={genre} onChange={e => setGenre(e.target.value)}>
            <option value="">All genres</option>
            {genre && !genres.includes(genre) && <option>{genre}</option>}
            {genres.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-400">Sort by
          <select className="input mt-1" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Recently added</option>
            <option value="oldest">Oldest added</option>
            <option value="title">Title A–Z</option>
            <option value="rating">Highest rated</option>
            <option value="year">Newest release</option>
          </select>
        </label>
      </div>
      {!loading && <div className="flex items-center justify-between gap-3 mb-3 min-h-8">
        <p className="text-xs text-gray-400" role="status">Showing {filtered.length} of {items.length} movies</p>
        {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>}
      </div>}
      {error && <div role="alert" className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-xl" style={{ background: '#181A20' }}>
              <div className="h-3.5 rounded w-48" style={{ background: '#2C313A' }} />
              <div className="h-3.5 rounded w-20 ml-auto" style={{ background: '#2C313A' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-gray-300">{items.length ? 'No movies match your filters.' : 'Your collection starts with a great movie.'}</p>
          <p className="text-xs text-gray-400 mt-2">{items.length ? 'Try another title, status, or genre.' : 'Add something you have watched or want to watch.'}</p>
          {items.length ? <button onClick={clearFilters} className="btn-secondary mt-4">Clear filters</button> : <Link to="/add" className="btn-primary mt-4">Add your first movie</Link>}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((item) => (
            <div key={item.item_id}>
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl transition-colors group"
                onMouseEnter={e => e.currentTarget.style.background = '#181A20'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Poster */}
                <div className="w-8 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                  {item.poster_url ? (
                    <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                        style={{ color: '#5a5f6e' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Title + year/genre */}
                <div className="flex-1 min-w-0 basis-[calc(100%-5rem)] sm:basis-0">
                  <p className="text-sm font-semibold truncate transition-colors" style={{ color: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.color='#E50914'}
                    onMouseLeave={e => e.currentTarget.style.color='#fff'}>{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.release_year && <span className="text-[11px]" style={{ color: '#5a5f6e' }}>{item.release_year}</span>}
                    {item.genres?.length > 0 && (
                      <>
                        <span style={{ color: '#2C313A' }}>·</span>
                        <span className="text-[11px] truncate" style={{ color: '#5a5f6e' }}>{item.genres.map(g => g.genre_name).join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating — only if Completed */}
                {item.completion_status === 'Completed' && (
                  <InlineRating item={item} onUpdated={onUpdated} onError={setError} />
                )}

                {/* Status badge (clickable dropdown) */}
                <StatusBadge item={item} onUpdated={onUpdated} onError={setError} />

                {/* Delete button — visible on hover */}
                <button onClick={() => setConfirmId(item.item_id)} title="Remove from collection"
                  aria-label={`Remove ${item.title} from collection`}
                  className="p-1.5 rounded-lg transition-colors sm:opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer"
                  style={{ color: '#5a5f6e' }}
                  onMouseEnter={e => { e.currentTarget.style.color='#E50914'; e.currentTarget.style.background='rgba(229,9,20,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color='#5a5f6e'; e.currentTarget.style.background='transparent'; }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>

              {/* Delete confirm row */}
              {confirmId === item.item_id && (
                <div className="mx-3 mb-1 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-scale-in"
                  style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#E50914' }}>Remove <span className="font-bold">"{item.title}"</span>?</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setConfirmId(null)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
                      style={{ color: '#A0A4AE', background: '#22252D', border: '1px solid #2C313A' }}>Cancel</button>
                    <button onClick={() => handleDelete(item.item_id)} disabled={deleting === item.item_id}
                      className="px-3 py-1.5 text-xs font-medium text-white rounded-lg cursor-pointer"
                      style={{ background: '#E50914', opacity: deleting === item.item_id ? 0.6 : 1 }}>
                      {deleting === item.item_id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
