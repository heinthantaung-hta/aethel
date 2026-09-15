import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function TrendingGrid({ movies }) {
  if (!movies || movies.length === 0) {
    // Skeleton while loading
    const skels = Array.from({ length: 8 });
    return (
      <div className="absolute inset-0 flex gap-2.5 p-3 overflow-hidden"
        style={{ maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)' }}>
        <div className="flex-1 flex flex-col gap-2.5">
          {skels.slice(0, 4).map((_, i) => (
            <div key={i} className="flex-1 rounded-xl animate-pulse" style={{ minHeight: '130px', background: '#22252D' }} />
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-2.5" style={{ marginTop: '36px' }}>
          {skels.slice(4).map((_, i) => (
            <div key={i} className="flex-1 rounded-xl animate-pulse" style={{ minHeight: '130px', background: '#1e2128' }} />
          ))}
        </div>
      </div>
    );
  }

  const left  = movies.slice(0, 4);
  const right = movies.slice(4, 8);

  return (
    <div className="absolute inset-0 flex gap-2.5 p-3 overflow-hidden"
      style={{ maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)' }}>
      {/* Left column */}
      <div className="flex-1 flex flex-col gap-2.5">
        {left.map(m => (
          <div key={m.tmdb_id} className="flex-1 rounded-xl overflow-hidden relative group"
            style={{ minHeight: '130px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <img src={m.poster_url} alt={m.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: 'brightness(0.82) saturate(1.1)' }} loading="eager" />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}>
              <p className="text-white font-black text-[10px] leading-tight truncate">{m.title}</p>
              {m.vote_average && (
                <p className="text-[9px] font-bold" style={{ color: '#F5C518' }}>★ {m.vote_average}</p>
              )}
            </div>
            {/* Rating badge */}
            {m.vote_average && (
              <div className="absolute top-2 right-2">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.3)' }}>
                  ★ {m.vote_average}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Right column — offset */}
      <div className="flex-1 flex flex-col gap-2.5" style={{ marginTop: '36px' }}>
        {right.map(m => (
          <div key={m.tmdb_id} className="flex-1 rounded-xl overflow-hidden relative group"
            style={{ minHeight: '130px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <img src={m.poster_url} alt={m.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ filter: 'brightness(0.82) saturate(1.1)' }} loading="eager" />
            <div className="absolute inset-0 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}>
              <p className="text-white font-black text-[10px] leading-tight truncate">{m.title}</p>
              {m.vote_average && (
                <p className="text-[9px] font-bold" style={{ color: '#F5C518' }}>★ {m.vote_average}</p>
              )}
            </div>
            {m.vote_average && (
              <div className="absolute top-2 right-2">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.3)' }}>
                  ★ {m.vote_average}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
import VerifyEmailForm from '../components/VerifyEmailForm';
import TwoFAForm from '../components/TwoFAForm';

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [trending, setTrending]         = useState([]);
  const [verifyEmail, setVerifyEmail]   = useState(null);
  const [devCode, setDevCode]           = useState(null);
  const [twoFA, setTwoFA]              = useState(null); // { tempToken }
  const { login, verifyEmail: doVerify, resendCode, verify2FA }  = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3001/api/movies/trending')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTrending(data.slice(0, 8)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Please fill in all fields.');
    try {
      setLoading(true);
      const result = await login(email, password);
      if (result?.requiresVerification) {
        setVerifyEmail(result.email);
        setDevCode(result.devCode || null);
      } else if (result?.requires2FA) {
        setTwoFA({ tempToken: result.tempToken });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0F1115' }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[140px]"
          style={{ background: 'rgba(229,9,20,0.07)' }} />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full blur-[120px]"
          style={{ background: 'rgba(245,197,24,0.04)' }} />
      </div>

      {/* Split card */}
      <div className="relative flex w-full overflow-hidden rounded-3xl animate-scale-in"
        style={{
          maxWidth: '860px',
          minHeight: '520px',
          background: '#181A20',
          border: '1px solid #2C313A',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>

        {/* ── Left: TMDB trending posters ── */}
        <div className="relative hidden md:flex flex-col"
          style={{ width: '42%', background: '#0d0d0f', flexShrink: 0, minHeight: '520px' }}>
          <TrendingGrid movies={trending} />

          {/* Gradient fade into form */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent 55%, #181A20 100%)' }} />

          {/* Trending badge */}
          <div className="absolute top-5 left-5 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ background: 'rgba(229,9,20,0.2)', color: '#E50914', border: '1px solid rgba(229,9,20,0.3)' }}>
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L11 22l8.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
              </svg>
              Trending This Week
            </span>
          </div>

          {/* Logo watermark */}
          <div className="absolute bottom-6 left-6 z-10">
            <p className="text-xl font-black" style={{ color: '#fff', letterSpacing: '-0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
              aethel<span style={{ color: '#E50914' }}>.</span>
            </p>
            <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Your movie universe</p>
          </div>
        </div>

        {/* ── Right: login form / verify / 2FA ── */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-10">

          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center">
            <p className="text-3xl font-black text-white" style={{ letterSpacing: '-0.04em' }}>
              aethel<span style={{ color: '#E50914' }}>.</span>
            </p>
          </div>

          {verifyEmail ? (
            /* Email verification step */
            <VerifyEmailForm
              email={verifyEmail}
              devCode={devCode}
              onVerify={async (code) => {
                await doVerify(verifyEmail, code);
                navigate('/', { replace: true });
              }}
              onResend={async () => {
                const r = await resendCode(verifyEmail);
                if (r?.devCode) setDevCode(r.devCode);
              }}
              onBack={() => { setVerifyEmail(null); setDevCode(null); }}
            />
          ) : twoFA ? (
            /* 2FA step */
            <TwoFAForm
              onVerify={async (code) => {
                await verify2FA(twoFA.tempToken, code);
                navigate('/', { replace: true });
              }}
              onBack={() => { setTwoFA(null); setError(''); }}
            />
          ) : (
            /* Normal login form */
            <>
              <div className="mb-7">
                <h1 className="text-[1.7rem] font-black text-white leading-tight mb-1.5"
                  style={{ letterSpacing: '-0.02em' }}>Welcome back,</h1>
                <p className="text-sm" style={{ color: '#A0A4AE' }}>Sign in to your account</p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium animate-scale-in"
                  style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.25)', color: '#E50914' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: '#A0A4AE' }}>Email</label>
                  <input type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    autoComplete="email" className="input" style={{ background: '#22252D' }} />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: '#A0A4AE' }}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      autoComplete="current-password" className="input pr-11"
                      style={{ background: '#22252D' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                      style={{ color: '#5a5f6e' }}>
                      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 !mt-6"
                  style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p className="mt-6 text-sm text-center" style={{ color: '#A0A4AE' }}>
                Don't have an account?{' '}
                <Link to="/signup" className="font-bold" style={{ color: '#E50914' }}>Sign up</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
