import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 6-digit code input for email verification.
 * Used by Signup and Login pages when requiresVerification is returned.
 */
export default function VerifyEmailForm({ email, onVerify, onResend, onBack, loading: externalLoading }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');
  const inputRefs = useRef([]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleChange = useCallback((idx, value) => {
    // Handle paste of full code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      pasted.forEach((d, i) => { if (idx + i < 6) newDigits[idx + i] = d; });
      setDigits(newDigits);
      setError('');
      const nextIdx = Math.min(idx + pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
      // Auto-submit if all filled
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

    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
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
    const code = codeOverride || digits.join('');
    if (code.length !== 6) return setError('Please enter all 6 digits.');
    try {
      setLoading(true);
      setError('');
      await onVerify(code);
    } catch (err) {
      setError(err.data?.error || err.message || 'Invalid code.');
      // Clear digits on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await onResend();
      setResendCooldown(60);
      setResendMsg('Code resent!');
      setTimeout(() => setResendMsg(''), 3000);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to resend code.');
    }
  };

  const isLoading = loading || externalLoading;

  return (
    <div className="text-center">
      {/* Email icon */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#E50914" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <h2 className="text-xl font-black text-white mb-1.5" style={{ letterSpacing: '-0.02em' }}>
        Verify your email
      </h2>
      <p className="text-sm mb-6" style={{ color: '#A0A4AE' }}>
        We sent a 6-digit code to <strong className="text-white">{email}</strong>
      </p>

      {/* 6-digit code input */}
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
              borderColor: d ? '#E50914' : '#2C313A',
              color: '#fff',
              caretColor: '#E50914',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#E50914'}
            onBlur={e => { if (!d) e.currentTarget.style.borderColor = '#2C313A'; }}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm font-medium mb-3 px-3 py-2 rounded-xl animate-scale-in"
          style={{ color: '#E50914', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)' }}>
          {error}
        </p>
      )}

      {resendMsg && (
        <p className="text-sm font-medium mb-3 px-3 py-2 rounded-xl"
          style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          ✓ {resendMsg}
        </p>
      )}

      <button
        onClick={() => handleSubmit()}
        disabled={isLoading || digits.some(d => !d)}
        className="btn-primary w-full py-3 mb-3"
        style={{ fontSize: '0.95rem', opacity: digits.some(d => !d) ? 0.5 : 1 }}>
        {isLoading ? 'Verifying…' : 'Verify Email'}
      </button>

      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="text-xs font-medium cursor-pointer transition-colors"
          style={{ color: '#5a5f6e' }}
          onMouseEnter={e => e.currentTarget.style.color = '#A0A4AE'}
          onMouseLeave={e => e.currentTarget.style.color = '#5a5f6e'}>
          ← Back
        </button>

        <button onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-xs font-semibold cursor-pointer transition-colors"
          style={{ color: resendCooldown > 0 ? '#3a3f4a' : '#E50914' }}>
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>

      <p className="text-[11px] mt-4" style={{ color: '#3a3f4a' }}>
        Code expires in 10 minutes. Check your spam folder if you don't see it.
      </p>
    </div>
  );
}
