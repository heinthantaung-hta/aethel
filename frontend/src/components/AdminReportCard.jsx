import { useState } from 'react';
import { api } from '../api/client';
import TimeAgo from './TimeAgo';
import { Badge, AdminAction as Action } from './AdminControls';

export default function AdminReportCard({ report, busy, runAction, confirmAction }) {
  const [note, setNote] = useState(report.admin_note || '');
  const target = report.target_details;
  const closed = ['resolved', 'dismissed'].includes(report.status);
  const save = status => runAction(() => api.adminUpdateReport(report.report_id, { status, admin_note: note }), `Report #${report.report_id} ${status}.`);
  return <article className="card p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge value={report.status} /><span className="text-xs text-gray-400">#{report.report_id} · {report.report_type} report</span>
      </div><TimeAgo date={report.created_at} />
    </div>
    <div>
      <h3 className="text-base font-semibold capitalize">{report.reason}</h3>
      <p className="text-xs text-gray-400 mt-1">Reported by @{report.reporter_username}</p>
      {report.details && <p className="text-sm text-gray-300 mt-3 whitespace-pre-wrap break-words">{report.details}</p>}
    </div>
    <div className="rounded-xl bg-[#181A20] border border-[#2C313A] p-4 space-y-2">
      <p className="text-xs uppercase tracking-wider text-gray-400">Reported content</p>
      {target ? <>
        <p className="text-sm font-semibold break-words">{target.title || target.display_name || target.username}</p>
        <p className="text-xs text-gray-400">@{target.username}{target.media_title ? ` · ${target.media_title}` : ''}</p>
        {target.body && <p className="text-sm text-gray-300 whitespace-pre-wrap break-words max-h-64 overflow-auto">{target.body}</p>}
        {target.status && <Badge value={target.status} />}
        {report.report_type === 'user' && <Badge value={target.is_banned ? 'banned' : 'active'} />}
        {!closed && <div className="flex flex-wrap gap-2 pt-2">
          {report.report_type === 'post' && target.status !== 'removed' && <Action disabled={busy} danger onClick={() => confirmAction({
            title: 'Remove reported post?', detail: 'The post will be hidden from the feed. You can restore it from Posts.',
            action: () => api.adminUpdatePostStatus(target.post_id, 'removed'), message: 'Post removed. You can now resolve the report.',
          })}>Remove post</Action>}
          {report.report_type === 'comment' && <Action disabled={busy} danger onClick={() => confirmAction({
            title: 'Delete reported comment?', detail: 'This permanently deletes the comment and its replies. This cannot be undone.',
            action: () => api.adminDeleteComment(target.comment_id), message: 'Comment deleted. You can now resolve the report.',
          })}>Delete comment</Action>}
          {report.report_type === 'user' && target.role !== 'admin' && !target.is_banned && <Action disabled={busy} danger onClick={() => confirmAction({
            title: `Ban @${target.username}?`, detail: 'This user will lose access until an administrator unbans them.',
            action: () => api.adminBanUser(target.user_id, true), message: 'User banned. You can now resolve the report.',
          })}>Ban user</Action>}
        </div>}
      </> : <p className="text-sm text-gray-400">This content is no longer available. You can still review and close the report.</p>}
    </div>
    <label className="block text-xs text-gray-400">Admin note
      <textarea className="input mt-2 min-h-20" value={note} maxLength={2000} disabled={busy || closed}
        onChange={e => setNote(e.target.value)} placeholder="Record your decision and the reason…" />
    </label>
    {closed ? <p className="text-xs text-gray-400 capitalize">{report.status}{report.resolved_by_username ? ` by @${report.resolved_by_username}` : ''}{report.resolved_at ? ` · ${new Date(report.resolved_at).toLocaleString()}` : ''}</p>
      : <>
        <p className="text-xs text-gray-400">Resolving closes this report. Content removal and user bans are separate actions above.</p>
        <div className="flex flex-wrap gap-2">
          <Action disabled={busy} onClick={() => save('reviewed')}>{report.status === 'reviewed' ? 'Save note' : 'Mark reviewed'}</Action>
          <button className="btn-primary" disabled={busy} onClick={() => save('resolved')}>Resolve report</button>
          <Action disabled={busy} onClick={() => save('dismissed')}>Dismiss report</Action>
        </div>
      </>}
  </article>;
}
