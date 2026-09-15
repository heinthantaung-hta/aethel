import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16" style={{ borderTop: '1px solid #2C313A' }}>
      {/* Subtle gradient glow at top */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(229,9,20,0.3), rgba(245,197,24,0.15), transparent)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Main footer grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-10">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/feed" className="inline-flex items-center gap-1.5 group">
              <span className="text-xl font-black tracking-tight"
                style={{ background: 'linear-gradient(135deg, #E50914, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                aethel.
              </span>
            </Link>
            <p className="text-xs leading-relaxed mt-2.5" style={{ color: '#5a5f6e' }}>
              Your cinematic universe. Track, rate, and discuss the films that move you.
            </p>
            {/* Social-style icons */}
            <div className="flex items-center gap-2 mt-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: '#22252D', color: '#5a5f6e' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,9,20,0.12)'; e.currentTarget.style.color = '#E50914'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#22252D'; e.currentTarget.style.color = '#5a5f6e'; }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: '#22252D', color: '#5a5f6e' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(29,155,240,0.12)'; e.currentTarget.style.color = '#1d9bf0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#22252D'; e.currentTarget.style.color = '#5a5f6e'; }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="mailto:hello@aethel.io"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: '#22252D', color: '#5a5f6e' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.color = '#10b981'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#22252D'; e.currentTarget.style.color = '#5a5f6e'; }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#A0A4AE' }}>Explore</h3>
            <ul className="space-y-2">
              {[
                { to: '/feed', label: 'Feed' },
                { to: '/whatsnew', label: "What's New" },
                { to: '/collection', label: 'My Collection' },
                { to: '/watchlist', label: 'Watchlist' },
              ].map(item => (
                <li key={item.to}>
                  <Link to={item.to}
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#5a5f6e' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#A0A4AE' }}>Account</h3>
            <ul className="space-y-2">
              {user && (
                <li>
                  <Link to={`/u/${user.username}`}
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#5a5f6e' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                    My Profile
                  </Link>
                </li>
              )}
              <li>
                <Link to="/profile"
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#5a5f6e' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                  Settings
                </Link>
              </li>
              {user?.role === 'admin' && (
                <li>
                  <Link to="/admin"
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#5a5f6e' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                    Admin Panel
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#A0A4AE' }}>Community</h3>
            <ul className="space-y-2">
              {[
                { label: 'About', href: '#' },
                { label: 'Guidelines', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
              ].map(item => (
                <li key={item.label}>
                  <a href={item.href}
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#5a5f6e' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E50914'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-5"
          style={{ borderTop: '1px solid #22252D' }}>
          <p className="text-[11px]" style={{ color: '#3a3f4a' }}>
            © {year} aethel. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: '#3a3f4a' }}>Powered by</span>
            <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{ color: '#5a5f6e' }}
              onMouseEnter={e => e.currentTarget.style.color = '#01b4e4'}
              onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
              <svg className="w-3 h-3" viewBox="0 0 273 36" fill="currentColor" style={{ width: 36 }}>
                <path d="M0 29.4V6.8h15.1v3.8H4.4v5.2h9.8v3.8H4.4v5.9h10.9v3.9H0zm39.9 0L34.6 18l-3.2 3.4v8h-4.3V6.8h4.3V17l8.2-10.2h5.3l-7.1 8.7 7.7 13.9h-5.6zm24.3 0l-1.5-4.3h-8.3l-1.5 4.3h-4.6L56.2 6.8h4l8 22.6h-4zm-6.6-19l-3 8.7h5.9l-2.9-8.7z" />
              </svg>
              TMDB
            </a>
          </div>
          <p className="text-[11px] flex items-center gap-1" style={{ color: '#3a3f4a' }}>
            Made with
            <svg className="w-3 h-3" fill="#E50914" viewBox="0 0 24 24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
            for film lovers
          </p>
        </div>
      </div>
    </footer>
  );
}
