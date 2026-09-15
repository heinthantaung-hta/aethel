import { useState } from 'react';
import { api } from '../api/client';

const REASONS = [
  { value: 'spam',            label: 'Spam',            icon: '🚫', desc: 'Repetitive, bot-like, or promotional content' },
  { value: 'harassment',      label: 'Harassment',      icon: '⚠️', desc: 'Bullying, threats, or targeted abuse' },
  { value: 'inappropriate',   label: 'Inappropriate',   icon: '🔞', desc: 'Offensive, graphic, or NSFW content' },
  { value: 'misinformation',  label: 'Misinformation',  icon: '❌', desc: 'False or misleading information' },
  { value: 'impersonation',   label: 'Impersonation',   icon: '🎭', desc: 'Pretending to be someone else' },
  { value: 'other',           label: 'Other',           icon: '📋', desc: 'Something else not listed above' },
];

export default function ReportModal({ reportType, targetId, targetLabel, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason) return setError('Please select a reason.');
    try {
      setLoading(true);
      setError('');
      await api.submitReport({ report_type: reportType, target_id: targetId, reason, details });
      setSuccess(true);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl animate-scale-in"
        style={{ background: '#1A1D24', border: '1px solid #2C313A', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '1px solid #2C313A' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Report {reportType === 'post' ? 'Post' : reportType === 'user' ? 'User' : 'Comment'}</h2>
              {targetLabel && <p className="text-[11px]" style={{ color: '#5a5f6e' }}>{targetLabel}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: '#22252D', color: '#5a5f6e' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2C313A'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#22252D'; e.currentTarget.style.color = '#5a5f6e'; }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="px-5 py-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Report Submitted</h3>
            <p className="text-sm mb-5" style={{ color: '#A0A4AE' }}>Thank you. Our team will review this report shortly.</p>
            <button onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all"
              style={{ background: '#22252D', color: '#A0A4AE', border: '1px solid #2C313A' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2C313A'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#22252D'; e.currentTarget.style.color = '#A0A4AE'; }}>
              Close
            </button>
          </div>
        ) : (
          /* Report form */
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs font-medium" style={{ color: '#A0A4AE' }}>Why are you reporting this?</p>

            {/* Reason cards */}
            <div className="space-y-1.5">
              {REASONS.map(r => (
                <button key={r.value} onClick={() => { setReason(r.value); setError(''); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left cursor-pointer transition-all"
                  style={{
                    background: reason === r.value ? 'rgba(239,68,68,0.08)' : 'transparent',
                    border: `1px solid ${reason === r.value ? 'rgba(239,68,68,0.3)' : '#2C313A'}`,
                  }}
                  onMouseEnter={e => { if (reason !== r.value) e.currentTarget.style.borderColor = '#3a3f4a'; }}
                  onMouseLeave={e => { if (reason !== r.value) e.currentTarget.style.borderColor = '#2C313A'; }}>
                  <span className="text-sm">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: reason === r.value ? '#ef4444' : '#fff' }}>{r.label}</p>
                    <p className="text-[10px] leading-snug" style={{ color: '#5a5f6e' }}>{r.desc}</p>
                  </div>
                  {reason === r.value && (
                    <svg className="w-4 h-4 shrink-0" fill="#ef4444" viewBox="0 0 24 24">
                      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Optional details */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5a5f6e' }}>
                Additional Details (optional)
              </label>
              <textarea value={details} onChange={e => setDetails(e.target.value)}
                placeholder="Provide more context to help us review..."
                className="input resize-none text-sm" rows={2} maxLength={500} />
            </div>

            {error && (
              <p className="text-xs font-semibold px-3 py-2 rounded-xl"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                style={{ background: '#22252D', color: '#A0A4AE', border: '1px solid #2C313A' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#A0A4AE'; }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading || !reason}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: reason ? '#ef4444' : '#2C313A',
                  color: reason ? '#fff' : '#5a5f6e',
                  opacity: loading ? 0.7 : 1,
                }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
