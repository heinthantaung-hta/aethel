import { useEffect, useRef, useId } from 'react';

export function Badge({ value }) {
  const colors = {
    pending: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
    flagged: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
    banned: 'text-red-300 bg-red-400/10 border-red-400/20',
    removed: 'text-red-300 bg-red-400/10 border-red-400/20',
    resolved: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
    published: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  };
  return <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${colors[value] || 'text-gray-300 bg-white/5 border-white/10'}`}>{value}</span>;
}

export function AdminAction({ children, onClick, danger = false, disabled = false }) {
  return <button type="button" disabled={disabled} onClick={onClick}
    className={`btn-secondary disabled:opacity-40 disabled:cursor-not-allowed ${danger ? '!text-red-300' : ''}`}>{children}</button>;
}

export function AdminConfirmation({ confirmation, busy, onCancel, onConfirm }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    aria-labelledby={titleId} aria-describedby={descriptionId}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#353944] bg-[#22252D] text-white p-6 backdrop:bg-black/70">
    <h2 id={titleId} className="text-lg font-semibold">{confirmation.title}</h2>
    <p id={descriptionId} className="text-sm text-gray-300 mt-3">{confirmation.detail}</p>
    <div className="flex justify-end gap-2 mt-6">
      <AdminAction disabled={busy} onClick={onCancel}>Cancel</AdminAction>
      <button className="btn-primary" disabled={busy} onClick={onConfirm}>{busy ? 'Saving…' : 'Confirm'}</button>
    </div>
  </dialog>;
}
