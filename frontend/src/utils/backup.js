export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export function readBackup(text) {
  let backup;
  try { backup = JSON.parse(text); }
  catch { throw new Error('This file is not valid JSON. Choose an Aethel backup.'); }
  if (backup?.format !== 'aethel-collection' || backup.version !== 1 || !Array.isArray(backup.items)) {
    throw new Error('Choose an Aethel collection backup (version 1).');
  }
  if (backup.items.length > 1000) throw new Error('A backup can contain up to 1,000 movies per file.');
  if (backup.items.some(item => !item || typeof item.title !== 'string' || !item.title.trim()
    || !['Completed', 'Watching', 'Want to Watch'].includes(item.completion_status))) {
    throw new Error('The backup contains an invalid movie. Your collection has not been changed.');
  }
  return backup;
}

// Split larger collections so every download can be restored within API limits.
export function backupParts(backup) {
  const parts = [];
  let items = [];
  const baseBytes = new Blob([JSON.stringify({ ...backup, items: [] })]).size;
  let bytes = baseBytes;
  for (const item of backup.items) {
    const itemBytes = new Blob([JSON.stringify(item)]).size + 1;
    if (baseBytes + itemBytes > MAX_BACKUP_BYTES - 1024) throw new Error('A movie is too large to back up. Shorten its overview and try again.');
    if (items.length && (items.length === 1000 || bytes + itemBytes > MAX_BACKUP_BYTES - 1024)) {
      parts.push({ ...backup, items });
      items = [];
      bytes = baseBytes;
    }
    items.push(item);
    bytes += itemBytes;
  }
  if (items.length || !parts.length) parts.push({ ...backup, items });
  return parts;
}
