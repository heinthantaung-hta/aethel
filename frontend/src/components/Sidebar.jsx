import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const userNavItems = [
  { to: '/feed',       label: 'Feed' },
  { to: '/whatsnew',   label: "What's New" },
  { to: '/collection', label: 'Collection' },
  { to: '/watchlist',  label: 'Watchlist' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin
    ? [{ to: '/feed', label: 'Feed' }, { to: '/admin', label: 'Admin Panel' }]
    : userNavItems;

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getInitials = () => (user?.display_name || user?.username || '?').charAt(0).toUpperCase();

  return (
    <nav
      className="fixed top-0 inset-x-0 z-40 h-14 flex items-center px-6"
      style={{
        background: 'rgba(24,26,32,0.92)',
        borderBottom: '1px solid #2C313A',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <button onClick={() => navigate('/feed')}
        className="text-xl font-black tracking-tight mr-8 cursor-pointer shrink-0"
        style={{ color: '#E50914', letterSpacing: '-0.03em' }}>
        aethel<span style={{ color: '#F5C518' }}>.</span>
      </button>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'text-white bg-white/10'
                  : 'text-[#A0A4AE] hover:text-white hover:bg-white/5'
              }`
            }
          >{label}</NavLink>
        ))}
      </div>

      {/* User menu */}
      <div ref={dropRef} className="relative ml-4 shrink-0">
        <button
          onClick={() => setDropOpen(o => !o)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all hover:bg-white/5"
          style={{ border: '1px solid #2C313A' }}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0"
            style={{ border: '2px solid #E50914' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-white"
                style={{ background: 'linear-gradient(135deg, #E50914, #c8070f)' }}>
                {getInitials()}
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block max-w-[120px] truncate">
            {user?.display_name || user?.username}
          </span>
          <svg className={`w-3.5 h-3.5 text-[#A0A4AE] transition-transform ${dropOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {dropOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-2xl overflow-hidden animate-scale-in z-50"
            style={{ background: '#22252D', border: '1px solid #2C313A' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #2C313A' }}>
              <p className="text-sm font-bold text-white truncate">{user?.display_name || user?.username}</p>
              <p className="text-xs truncate" style={{ color: '#A0A4AE' }}>@{user?.username}</p>
            </div>
            <div className="py-1.5">
              {!isAdmin && (
                <button onClick={() => { navigate(`/u/${user?.username}`); setDropOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                  style={{ color: '#A0A4AE' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#A0A4AE'; }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  My Profile
                </button>
              )}
              <button onClick={() => { logout(); setDropOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
                style={{ color: '#E50914' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(229,9,20,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
