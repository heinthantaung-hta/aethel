import { useState, useRef, useCallback } from 'react';


export default function TwoFAForm({ onVerify, onBack, loading: externalLoading }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const inputRefs = useRef([]);

  const handleChange = useCallback((idx, value) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      pasted.forEach((d, i) => { if (idx + i < 6) newDigits[idx + i] = d; });
      setDigits(newDigits);
      setError('');
      const nextIdx = Math.min(idx + pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
      if (newDigits.every(d => d !== '')) {
        setTimeout(() => handleSubmit(newDigits.join('')), 100);
      }
      return;
    }
    const char = value.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[idx] = char;
    setDigits(newDigits);
    setError('');
    if (char && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (char && newDigits.every(d => d !== '')) {
      setTimeout(() => handleSubmit(newDigits.join('')), 100);
    }
  }, [digits]);

  const handleKeyDown = useCallback((idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const newDigits = [...digits];
      newDigits[idx - 1] = '';
      setDigits(newDigits);
      inputRefs.current[idx - 1]?.focus();
    }
  }, [digits]);

  const handleSubmit = async (codeOverride) => {
    const code = useRecovery ? recoveryCode.trim() : (codeOverride || digits.join(''));
    if (!useRecovery && code.length !== 6) return setError('Please enter all 6 digits.');
    if (useRecovery && !code) return setError('Please enter a recovery code.');
    try {
      setLoading(true);
      setError('');
      await onVerify(code);
    } catch (err) {
      setError(err.data?.error || err.message || 'Invalid code.');
      if (!useRecovery) {
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || externalLoading;

  return (
    <div className="text-center">
      {/* Shield icon */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>

      <h2 className="text-xl font-black text-white mb-1.5" style={{ letterSpacing: '-0.02em' }}>
        Two-Factor Authentication
      </h2>
      <p className="text-sm mb-6" style={{ color: '#A0A4AE' }}>
        {useRecovery
          ? 'Enter one of your recovery codes'
          : 'Enter the 6-digit code from your authenticator app'}
      </p>

      {useRecovery ? (
        /* Recovery code input */
        <div className="mb-4">
          <input
            type="text"
            value={recoveryCode}
            onChange={e => { setRecoveryCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="XXXX-XXXX"
            autoFocus
            disabled={isLoading}
            className="input text-center text-lg font-mono font-bold tracking-widest"
            style={{ background: '#22252D', letterSpacing: '0.15em' }}
          />
        </div>
      ) : (
        /* TOTP digit input */
        <div className="flex justify-center gap-2 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              disabled={isLoading}
              className="w-11 h-14 text-center text-xl font-black rounded-xl border-2 outline-none transition-all"
              style={{
                background: '#22252D',
                borderColor: d ? '#60a5fa' : '#2C313A',
                color: '#fff',
                caretColor: '#60a5fa',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#60a5fa'}
              onBlur={e => { if (!d) e.currentTarget.style.borderColor = '#2C313A'; }}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm font-medium mb-3 px-3 py-2 rounded-xl animate-scale-in"
          style={{ color: '#E50914', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
          {error}
        </p>
      )}

      <button
        onClick={() => handleSubmit()}
        disabled={isLoading || (!useRecovery && digits.some(d => !d)) || (useRecovery && !recoveryCode.trim())}
        className="btn-primary w-full py-3 mb-3"
        style={{ fontSize: '0.95rem' }}>
        {isLoading ? 'Verifying…' : 'Verify'}
      </button>

      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="text-xs font-medium cursor-pointer transition-colors"
          style={{ color: '#5a5f6e' }}
          onMouseEnter={e => e.currentTarget.style.color = '#A0A4AE'}
          onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
          ← Back
        </button>

        <button onClick={() => { setUseRecovery(!useRecovery); setError(''); setDigits(['','','','','','']); setRecoveryCode(''); }}
          className="text-xs font-semibold cursor-pointer transition-colors"
          style={{ color: '#60a5fa' }}>
          {useRecovery ? 'Use authenticator' : 'Use recovery code'}
        </button>
      </div>
    </div>
  );
}
