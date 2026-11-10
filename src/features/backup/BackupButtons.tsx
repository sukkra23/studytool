import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { confirm } from '../../components/ConfirmDialog';
import { downloadBlob, pickFile } from '../../lib/download';
import { exportBackup, readBackup, restoreBackup } from './backup';

export function BackupButtons() {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const onExport = async () => {
    try {
      const blob = await exportBackup();
      downloadBlob(blob, `studytool-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage({ text: 'Backup downloaded.', error: false });
    } catch (e) {
      setMessage({ text: `Export failed: ${(e as Error).message}`, error: true });
    }
  };

  const onImport = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const { file: backup, summary } = readBackup(await file.text());
      const when = summary.exportedAt ? new Date(summary.exportedAt).toLocaleString() : 'unknown date';
      const ok = await confirm({
        title: 'Replace all data with this backup?',
        message: `Backup from ${when}\n${summary.subjects} subject(s), ${summary.chapters} chapter(s), ${summary.images} image(s).\n\nEverything currently in the app will be deleted and replaced. Export a backup first if you want to keep it.`,
        confirmLabel: 'Replace everything',
      });
      if (!ok) return;
      await restoreBackup(backup);
      window.location.reload();
    } catch (e) {
      setMessage({ text: `Import failed: ${(e as Error).message}`, error: true });
    }
  };

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Backup</div>
      <div className="flex gap-2">
        <button className="btn flex-1 !px-2 text-xs" onClick={() => void onExport()} title="Download all data as one JSON file">
          <Icon name="download" size={14} /> Export
        </button>
        <button className="btn flex-1 !px-2 text-xs" onClick={() => void onImport()} title="Restore from a backup JSON file">
          <Icon name="upload" size={14} /> Import
        </button>
      </div>
      {message && (
        <div className={`mt-2 text-xs ${message.error ? 'text-red-500' : 'text-muted'}`} role="status" data-backup-message>
          {message.text}
        </div>
      )}
    </div>
  );
}
