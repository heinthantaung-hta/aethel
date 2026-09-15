import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const statusColors = {
  'Completed': 'border text-[#10b981]',
  'Watching': 'border text-[#F5C518]',
  'Want to Watch': 'border text-[#60a5fa]',
};

export default function Backlog() {
  const [backlog, setBacklog] = useState([]);
  const [nextItem, setNextItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const fetchBacklog = useCallback(async () => {
    try { setLoading(true); setBacklog(await api.getBacklog()); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBacklog(); }, [fetchBacklog]);

  const processNext = async () => {
    try {
      setNextLoading(true);
      const data = await api.getBacklogNext();
      if (data.message) { setNextItem(null); setError(data.message); }
      else { setNextItem(data); setError(null); }
    } catch (err) { setError(err.message); }
    finally { setNextLoading(false); }
  };

  const markStatus = async (itemId, newStatus) => {
    try {
      setStatusUpdating(itemId);
      await api.updateStatus(itemId, newStatus);
      await fetchBacklog();
      if (nextItem?.item_id === itemId) setNextItem(null);
    } catch (err) { setError(err.message); }
    finally { setStatusUpdating(null); }
  };

  const deleteItem = async (itemId) => {
    try {
      setStatusUpdating(itemId);
      await api.delete(itemId);
      await fetchBacklog();
      if (nextItem?.item_id === itemId) setNextItem(null);
    } catch (err) { setError(err.message); }
    finally { setStatusUpdating(null); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Watchlist</h1>
          <p className="text-sm text-gray-400 mt-0.5">{backlog.length} movie{backlog.length !== 1 ? 's' : ''} to watch</p>
        </div>
        <button onClick={processNext} disabled={nextLoading || backlog.length === 0}
          className="btn-primary shrink-0">
          {nextLoading ? 'Loading...' : 'Pick Next Movie'}
        </button>
      </div>

      {/* Next Item */}
      {nextItem && (
        <div className="card p-5 animate-scale-in" style={{border:"2px solid rgba(229,9,20,0.3)",background:"rgba(229,9,20,0.05)"}}>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge text-white">Next Up</span>
            <span className="text-[11px] text-gray-400">Oldest item in queue</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{nextItem.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
            <span>{nextItem.release_year}</span>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-3.5 h-3.5 ${i < nextItem.rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => markStatus(nextItem.item_id, 'Watching')} disabled={statusUpdating === nextItem.item_id}
              className="btn-secondary">Start Watching</button>
            <button onClick={() => markStatus(nextItem.item_id, 'Completed')} disabled={statusUpdating === nextItem.item_id}
              className="btn-secondary">Mark Watched</button>
          </div>
        </div>
      )}

      {error && !nextItem && (
        <div className="card px-4 py-3 animate-scale-in" style={{background:"rgba(229,9,20,0.1)",borderColor:"rgba(229,9,20,0.25)"}}>
          <p className="text-sm font-medium" style={{color:"#E50914"}}>{error}</p>
        </div>
      )}

      {/* Queue */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-white mb-0.5">Queue</h2>
        <p className="text-xs text-gray-400 mb-4">Movies ordered by date added (oldest first)</p>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-xl bg-[#22252D]">
                <div className="h-3.5 bg-[#2C313A] rounded w-48" />
                <div className="h-3.5 bg-[#2C313A] rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : backlog.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-medium text-white">All caught up!</p>
            <p className="text-sm mt-1" style={{ color: '#A0A4AE' }}>Your backlog is empty.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {backlog.map((item, index) => (
              <div key={item.item_id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                  nextItem?.item_id === item.item_id ? 'border border-[#2C313A]' : 'hover:bg-[#181A20]'
                }`}>
                <span className="text-xs font-bold text-gray-300 w-6 text-center shrink-0">#{index + 1}</span>
                {/* Poster */}
                <div className="w-8 h-12 rounded-lg overflow-hidden shrink-0"
                  style={{ background: '#22252D', border: '1px solid #2C313A' }}>
                  {item.poster_url ? (
                    <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#5a5f6e" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-[#E50914] transition-colors">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">{item.release_year}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3 h-3" fill={i < item.rating ? '#F5C518' : 'none'}
                      stroke={i < item.rating ? 'none' : '#2C313A'} strokeWidth={1.5} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => markStatus(item.item_id, 'Watching')} disabled={statusUpdating === item.item_id} title="Start Watching"
                    className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50" style={{color:"#F5C518"}}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
                  </button>
                  <button onClick={() => markStatus(item.item_id, 'Completed')} disabled={statusUpdating === item.item_id} title="Complete"
                    className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50" style={{color:"#10b981"}}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                  <button onClick={() => deleteItem(item.item_id)} disabled={statusUpdating === item.item_id} title="Delete"
                    className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50" style={{color:"#E50914"}}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${statusColors[item.completion_status]}`} style={{background:"rgba(255,255,255,0.05)"}}>
                  {item.completion_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
