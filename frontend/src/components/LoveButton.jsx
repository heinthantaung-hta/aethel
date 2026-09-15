import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// LoveButton updated to cinema theme
export default function LoveButton({ loved, count, onToggle, compact = false }) {
  const [animating, setAnimating] = useState(false);

  const handleClick = async () => {
    setAnimating(true);
    await onToggle();
    setTimeout(() => setAnimating(false), 500);
  };

  if (compact) {
    return (
      <button onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
          loved ? '' : ''
        }`}
        style={{
          color: loved ? '#E50914' : '#5a5f6e',
          background: 'transparent',
        }}
        onMouseEnter={e => { if (!loved) { e.currentTarget.style.color='#E50914'; e.currentTarget.style.background='rgba(229,9,20,0.08)'; }}}
        onMouseLeave={e => { if (!loved) { e.currentTarget.style.color='#5a5f6e'; e.currentTarget.style.background='transparent'; }}}>
        <svg
          className={`w-[17px] h-[17px] transition-all duration-300 ${animating ? 'scale-125' : 'scale-100'}`}
          viewBox="0 0 24 24" fill={loved ? '#E50914' : 'none'}
          stroke={loved ? 'none' : 'currentColor'} strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <span className="text-sm font-semibold tabular-nums">{count}</span>
      </button>
    );
  }

  return (
    <button onClick={handleClick} className="group flex items-center gap-1.5 cursor-pointer transition-all">
      <span className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200`}
        style={{ background: loved ? 'rgba(229,9,20,0.12)' : 'rgba(255,255,255,0.04)', color: loved ? '#E50914' : '#5a5f6e' }}>
        <svg
          className={`w-[18px] h-[18px] transition-transform duration-300 ${animating ? 'scale-125' : 'scale-100'}`}
          viewBox="0 0 24 24"
          fill={loved ? '#E50914' : 'none'}
          stroke={loved ? 'none' : 'currentColor'}
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </span>
      <span className="text-sm font-semibold tabular-nums transition-colors"
        style={{ color: loved ? '#E50914' : '#5a5f6e' }}>{count}</span>
    </button>
  );
}
