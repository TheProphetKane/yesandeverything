// storage-notice.js - the status-line wording for a storage failure.
//
// persist.js and saved-labels.js broadcast yaa:storage-error with
// { key, op, backupKey? }. This turns that detail into the line the editor
// shows, plus the copy to offer as a download when an unreadable entry was
// kept aside. No DOM here, so the wording and the download are under test;
// the editor builds the link from what this returns.

const MESSAGES = {
  read:  'Could not read your saved data. It may be corrupted; starting fresh.',
  clear: 'Could not clear the stored label. The old one may come back on reload.',
  write: 'Storage is full. Changes may not save. Delete unused saved labels.',
};

const KEPT = {
  state: {
    text: 'Could not read your saved label, so the editor started fresh. A copy was kept.',
    filename: 'apothecary-unreadable-label.txt',
  },
  'saved-labels': {
    text: 'Could not read part of your saved labels. A copy of the whole library was kept.',
    filename: 'apothecary-unreadable-saved-labels.txt',
  },
};

// readItem(key) returns the stored string or null, normally
// localStorage.getItem. Returns { text, download } where download is
// { label, filename, data } or null.
export function storageNotice(detail, readItem) {
  const op = detail && detail.op;
  const kept = op === 'read' && detail.backupKey ? KEPT[detail.key] : null;
  if (kept) {
    let data = null;
    try { data = readItem(detail.backupKey); } catch { data = null; }
    if (typeof data === 'string' && data.length > 0) {
      return {
        text: kept.text,
        download: { label: 'Download the copy', filename: kept.filename, data },
      };
    }
  }
  return { text: MESSAGES[op] || MESSAGES.write, download: null };
}
