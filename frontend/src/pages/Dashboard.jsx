import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import KpiCards from '../components/KpiCards';
import RecentFeed from '../components/RecentFeed';
import { collectionStats } from '../utils/collection';

export default function Dashboard() {
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLatest(await api.getAll());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = (itemId) => {
    setLatest(items => items.filter(item => item.item_id !== itemId));
  };

  const handleUpdated = (itemId, patch) => {
    setLatest(items => items.map(item => item.item_id === itemId ? { ...item, ...patch } : item));
  };

  if (error) return (
    <div className="card p-8 text-center animate-fade-in">
      <p className="font-medium" style={{color:"#E50914"}}>Failed to load collection</p>
      <p className="text-gray-400 text-sm mt-1">{error}</p>
      <button onClick={fetchData} className="btn-primary mt-4">Retry</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header row with Add Movie button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Collection</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0A4AE' }}>Your personal movie library</p>
        </div>
        <Link to="/add" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Movie
        </Link>
      </div>

      <KpiCards stats={collectionStats(latest)} loading={loading} />
      <RecentFeed items={latest} loading={loading} onDelete={handleDelete} onUpdated={handleUpdated} />
    </div>
  );
}
