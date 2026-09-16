import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AdminAction, AdminConfirmation } from './AdminControls';
import { canModerateUser } from '../utils/admin';

export default function AdminBanControl({ target, onChanged }) {
  const { user } = useAuth();
  const [banned, setBanned] = useState(Boolean(target.is_banned));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const lock = useRef(false);

  useEffect(() => { setBanned(Boolean(target.is_banned)); setFeedback(null); setOpen(false); }, [target.user_id, target.is_banned]);
  useEffect(() => {
    const handleUpdate = event => {
      if (event.detail.user_id === target.user_id) setBanned(event.detail.is_banned);
    };
    window.addEventListener('aethel:user-moderated', handleUpdate);
    return () => window.removeEventListener('aethel:user-moderated', handleUpdate);
  }, [target.user_id]);

  if (!canModerateUser(user, target)) return null;
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await api.adminBanUser(target.user_id, !banned);
      setBanned(updated.is_banned);
      window.dispatchEvent(new CustomEvent('aethel:user-moderated', { detail: updated }));
      setFeedback({ success: true, message: `@${target.username} ${updated.is_banned ? 'banned' : 'unbanned'}.` });
      onChanged?.(updated);
    } catch (error) {
      setFeedback({ success: false, message: error.message || 'Unable to update this user. Please try again.' });
    } finally { setOpen(false); setBusy(false); lock.current = false; }
  };

  return <div className="space-y-2">
    <AdminAction disabled={busy} danger={!banned} onClick={() => setOpen(true)}>{busy ? 'Saving…' : banned ? 'Unban user' : 'Ban user'}</AdminAction>
    {feedback && <p role={feedback.success ? 'status' : 'alert'} className={`text-xs ${feedback.success ? 'text-emerald-300' : 'text-red-300'}`}>{feedback.message}</p>}
    {open && <AdminConfirmation busy={busy} onCancel={() => setOpen(false)} onConfirm={save} confirmation={{
      title: `${banned ? 'Unban' : 'Ban'} @${target.username}?`,
      detail: banned ? 'This restores their access to Aethel.' : 'This blocks access, including existing sessions. Their posts remain visible until you remove them separately.',
    }} />}
  </div>;
}
