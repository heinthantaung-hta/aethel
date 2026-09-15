import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SecuritySettings() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState('idle'); // idle | setup | confirm | recovery | disabling
  const [qrData, setQrData] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const is2FAEnabled = user?.totp_enabled;

  const handleSetup = async () => {
    try {
      setLoading(true); setError('');
      const data = await api.setup2FA();
      setQrData(data.qrCode);
      setSecret(data.secret);
      setStep('setup');
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!code || code.length !== 6) return setError('Enter the 6-digit code from your app.');
    try {
      setLoading(true); setError('');
      const data = await api.confirm2FA(code);
      setRecoveryCodes(data.recoveryCodes);
      setStep('recovery');
      updateUser({ ...user, totp_enabled: true });
    } catch (err) {
      setError(err.data?.error || err.message || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) return setError('Password is required.');
    try {
      setLoading(true); setError('');
      await api.disable2FA(password);
      updateUser({ ...user, totp_enabled: false });
      setStep('idle');
      setPassword('');
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Two-Factor Authentication</h3>
          <p className="text-[11px]" style={{ color: '#5a5f6e' }}>
            {is2FAEnabled ? 'Enabled — your account has extra protection' : 'Add an extra layer of security to your account'}
          </p>
        </div>
        <div className="ml-auto">
          {is2FAEnabled ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              Enabled
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.25)' }}>
              Off
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ color: '#E50914', background: 'rgba(229,9,20,0.08)', border: '1px solid rgba(229,9,20,0.2)' }}>
          {error}
        </div>
      )}

      {/* Idle state */}
      {step === 'idle' && !is2FAEnabled && (
        <button onClick={handleSetup} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
          style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {loading ? 'Setting up…' : 'Enable 2FA'}
        </button>
      )}

      {step === 'idle' && is2FAEnabled && (
        <button onClick={() => { setStep('disabling'); setError(''); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
          style={{ background: 'rgba(229,9,20,0.08)', color: '#E50914', border: '1px solid rgba(229,9,20,0.2)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,9,20,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229,9,20,0.08)'; }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Disable 2FA
        </button>
      )}

      {/* Setup step — scan QR */}
      {step === 'setup' && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-xs font-medium mb-3" style={{ color: '#A0A4AE' }}>
              Scan this QR code with your authenticator app
            </p>
            <div className="inline-block p-3 rounded-xl" style={{ background: '#22252D', border: '1px solid #2C313A' }}>
              {qrData && <img src={qrData} alt="2FA QR Code" className="w-48 h-48" />}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5a5f6e' }}>
              Or enter this key manually:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono break-all"
                style={{ background: '#22252D', color: '#F5C518', border: '1px solid #2C313A' }}>
                {secret}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(secret); }}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                style={{ background: '#22252D', color: '#A0A4AE', border: '1px solid #2C313A' }}>
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#A0A4AE' }}>
              Enter verification code
            </label>
            <input type="text" inputMode="numeric" maxLength={6}
              value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="000000"
              className="input text-center text-lg font-mono font-bold tracking-[0.3em]"
              style={{ background: '#22252D' }} />
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setStep('idle'); setError(''); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: '#22252D', color: '#A0A4AE', border: '1px solid #2C313A' }}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={loading || code.length !== 6}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white"
              style={{ background: code.length === 6 ? '#60a5fa' : '#2C313A', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying…' : 'Verify & Enable'}
            </button>
          </div>
        </div>
      )}

      {/* Recovery codes step */}
      {step === 'recovery' && (
        <div className="space-y-4 animate-fade-in">
          <div className="px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-xs font-bold" style={{ color: '#10b981' }}>
              ✓ 2FA is now enabled!
            </p>
          </div>

          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#A0A4AE' }}>
              Save these recovery codes in a safe place. Each code can only be used once.
            </p>
            <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl"
              style={{ background: '#22252D', border: '1px solid #2C313A' }}>
              {recoveryCodes.map((c, i) => (
                <code key={i} className="text-xs font-mono font-bold text-center py-1 rounded"
                  style={{ color: '#F5C518', background: '#1A1D24' }}>
                  {c}
                </code>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={copyRecoveryCodes}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: '#22252D', color: copied ? '#10b981' : '#A0A4AE', border: '1px solid #2C313A' }}>
              {copied ? '✓ Copied!' : 'Copy Codes'}
            </button>
            <button onClick={() => { setStep('idle'); setCode(''); setRecoveryCodes([]); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white"
              style={{ background: '#60a5fa' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Disable step */}
      {step === 'disabling' && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs font-medium" style={{ color: '#A0A4AE' }}>
            Enter your password to disable two-factor authentication.
          </p>
          <input type="password" value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Your password"
            className="input" style={{ background: '#22252D' }} />
          <div className="flex gap-2">
            <button onClick={() => { setStep('idle'); setPassword(''); setError(''); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: '#22252D', color: '#A0A4AE', border: '1px solid #2C313A' }}>
              Cancel
            </button>
            <button onClick={handleDisable} disabled={loading || !password}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white"
              style={{ background: '#E50914', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
