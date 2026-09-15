import { useRef, useState } from 'react';
import { api } from '../api/client';
import { readBackup, backupParts, MAX_BACKUP_BYTES } from '../utils/backup';

function TransferIcon({ upload = false }) {
  return <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={upload ? 'M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4' : 'M12 3v13m-5-5 5 5 5-5M4 17v3h16v-3'} />
  </svg>;
}

export default function CollectionBackup({ onRestored, disabled }) {
  const fileInput = useRef(null);
  const [preview, setPreview] = useState(null);
  const [parts, setParts] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const download = (part, index = 0) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(part)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aethel-collection-${new Date().toISOString().slice(0, 10)}-${index + 1}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCollection = async () => {
    setBusy('export'); setError(''); setMessage(''); setParts([]);
    try {
      const files = backupParts(await api.exportCollection());
      if (files.length === 1) { download(files[0]); setMessage('Backup downloaded. Keep it somewhere safe.'); }
      else { setParts(files); setMessage(`Your library is ready in ${files.length} parts. Download each part below.`); }
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  };

  const chooseFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('read'); setPreview(null); setError(''); setMessage('');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a backup smaller than 5 MB.');
      setPreview({ name: file.name, backup: readBackup(await file.text()) });
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  };

  const restore = async () => {
    setBusy('import'); setError(''); setMessage('');
    try {
      const result = await api.importCollection(preview.backup);
      setMessage(`Restore complete: ${result.imported} added, ${result.skipped} already in your collection.`);
      setPreview(null);
      await onRestored();
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  };

  return <section className="collection-vault" aria-labelledby="backup-heading" aria-busy={Boolean(busy)}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
      <div className="flex items-start gap-3">
        <span className="vault-icon"><TransferIcon /></span>
        <div>
          <h2 id="backup-heading" className="font-semibold text-white">Your library, kept safe</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">Take your movies, ratings, and watchlist with you. Restore a backup whenever you need it.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button className="btn-secondary" disabled={Boolean(busy) || disabled} onClick={exportCollection}>
          <TransferIcon />{busy === 'export' ? 'Preparing…' : 'Download backup'}
        </button>
        <button className="btn-secondary" disabled={Boolean(busy) || disabled} onClick={() => fileInput.current.click()}>
          <TransferIcon upload />{busy === 'read' ? 'Reading…' : 'Restore backup'}
        </button>
        <input ref={fileInput} className="hidden" type="file" accept=".json,application/json" aria-label="Choose collection backup" onChange={chooseFile} />
      </div>
    </div>

    {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {parts.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{parts.map((part, i) =>
      <button key={i} className="btn-secondary" onClick={() => download(part, i)}>Download part {i + 1} · {part.items.length} movies</button>
    )}</div>}

    {preview && <div className="restore-preview mt-5" aria-labelledby="restore-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-amber-300 mb-1">Ready to restore</p>
          <h3 id="restore-heading" className="font-semibold text-white break-all">{preview.name}</h3>
        </div>
        <span className="text-2xl font-semibold text-white">{preview.backup.items.length}<span className="ml-2 text-sm font-normal text-gray-400">movies</span></span>
      </div>
      <p className="text-sm text-gray-400 mt-3">New movies will be added. Existing movies and their ratings stay unchanged. Duplicates are skipped automatically.</p>
      <ul className="mt-3 space-y-1 text-sm text-gray-300">{preview.backup.items.slice(0, 3).map((item, i) => <li key={i} className="truncate">{item.title}</li>)}</ul>
      {preview.backup.items.length > 3 && <p className="text-xs text-gray-400 mt-1">And {preview.backup.items.length - 3} more</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        <button className="btn-primary" disabled={Boolean(busy) || !preview.backup.items.length} onClick={restore}>{busy === 'import' ? 'Restoring…' : 'Confirm restore'}</button>
        <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => setPreview(null)}>Cancel</button>
      </div>
    </div>}
  </section>;
}
