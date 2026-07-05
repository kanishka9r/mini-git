import { useState, useEffect, useCallback } from 'react';
import { vcsClient } from '../api/vcsClient';
import { useStore } from '../store/useStore';
import type { FileChange, DiffLine } from '../types';

function DiffViewer({ lines }: { lines: DiffLine[] }) {
  if (lines.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-text-muted text-xs py-12">
      <p>No differences</p>
    </div>
  );

  return (
    <div className="font-mono text-xs overflow-auto h-full p-4">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`px-3 py-px whitespace-pre-wrap leading-6 rounded-sm ${
            line.type === '+' ? 'diff-added' :
            line.type === '-' ? 'diff-removed' : 'diff-context'
          }`}
        >
          <span className="select-none mr-3 opacity-40 inline-block w-3 text-right">
            {line.type === '+' ? '+' : line.type === '-' ? '-' : ' '}
          </span>
          {line.text}
        </div>
      ))}
    </div>
  );
}

const statusColor: Record<string, string> = {
  added: 'text-accent-green',
  modified: 'text-accent-yellow',
  deleted: 'text-accent-red',
};
const statusDot: Record<string, string> = {
  added: 'bg-accent-green',
  modified: 'bg-accent-yellow',
  deleted: 'bg-accent-red',
};

export default function SavePage() {
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [selected, setSelected] = useState<FileChange | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshStatus, isInitialized } = useStore();

  const loadChanges = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await vcsClient.changes();
      setChanges(data);
      setSelected(null);
      setDiffLines([]);
    } catch { void 0; }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadChanges();
    });
  }, [loadChanges]);

  async function handleFileClick(change: FileChange) {
    setSelected(change);
    setDiffLines([]);
    try {
      const diff = await vcsClient.diff(change.oldHash, change.filename);
      setDiffLines(diff);
    } catch { setDiffLines([]); }
  }

  async function handleSave() {
    if (!message.trim()) { setStatus({ msg: 'Please enter a commit message.', ok: false }); return; }
    if (changes.length === 0) { setStatus({ msg: 'No changes to save.', ok: false }); return; }

    setSaving(true);
    setStatus(null);
    try {
      const filesToAdd = changes.map(c => c.filename);
      if (filesToAdd.length > 0) await vcsClient.add(filesToAdd);

      const res = await vcsClient.commit(message.trim());
      if (!res.success) throw new Error(res.message || 'Commit failed');

      setStatus({ msg: `Saved! Commit ${res.hash?.substring(0, 8)}`, ok: true });
      setMessage('');
      await loadChanges();
      await refreshStatus();
    } catch (e) {
      const err = e as Error;
      setStatus({ msg: err.message || 'Save failed', ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">

      <div className="px-8 py-6 flex items-center justify-between flex-shrink-0 border-b border-border bg-bg-secondary/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Save Changes</h1>
          <p className="text-text-secondary mt-0.5 text-sm">Review changes and commit to your repository</p>
        </div>
        <div className="flex items-center gap-3">
          {changes.length > 0 && (
            <span className="px-3 py-1 bg-accent-yellow/10 text-accent-yellow rounded-full text-xs font-semibold border border-accent-yellow/20">
              {changes.length} changed
            </span>
          )}
          <button
            onClick={loadChanges}
            disabled={refreshing}
            className="px-4 py-2 bg-bg-tertiary border border-border hover:bg-bg-hover
                       text-text-secondary hover:text-text-primary rounded-lg text-xs font-semibold
                       transition-all duration-200 cursor-pointer disabled:opacity-40"
          >
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {!isInitialized ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="card flex flex-col items-center justify-center py-16 text-center w-full max-w-md">
            <p className="text-text-secondary text-sm">Repository not initialized</p>
            <p className="text-text-muted text-xs mt-1">Go to Dashboard to create a project first</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 px-8 py-5 gap-5">

          <div className="flex gap-5 flex-1 min-h-0">

            <div className="w-72 flex-shrink-0 bg-bg-secondary border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-bg-tertiary/55">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Changed Files</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {changes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-text-muted text-sm">Working directory clean</p>
                  </div>
                ) : (
                  changes.map((c) => (
                    <button
                      key={c.filename}
                      onClick={() => handleFileClick(c)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3
                                  transition-all duration-150 cursor-pointer border-l-2
                                  ${selected?.filename === c.filename
                                    ? 'bg-accent-blue/5 border-accent-blue font-semibold'
                                    : 'border-transparent hover:bg-bg-tertiary/40'
                                  }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[c.status]}`} />
                      <span className={`truncate font-mono text-xs ${statusColor[c.status]}`}>
                        {c.filename}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>


            <div className="flex-1 bg-bg-secondary border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-bg-tertiary/55">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                  {selected ? selected.filename : 'Diff Viewer'}
                </h3>
              </div>
              <div className="flex-1 overflow-auto">
                {selected ? (
                  <DiffViewer lines={diffLines} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm py-12">
                    <p>Select a file to view changes</p>
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="bg-bg-secondary border border-border rounded-lg px-4 py-3.5 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Describe your changes"
                className="flex-1 px-4 py-3 bg-bg-primary border border-border rounded-lg
                           text-text-primary text-sm placeholder-text-muted/40
                           focus:border-border-active transition-colors duration-200"
              />
              <button
                onClick={handleSave}
                disabled={saving || changes.length === 0}
                className="px-5 py-3 bg-btn-blue hover:bg-btn-blue-hover disabled:bg-bg-tertiary disabled:text-text-muted
                           text-white font-semibold rounded-lg text-sm transition-all duration-200
                           cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
              >
                {saving ? 'Saving' : 'Commit'}
              </button>
            </div>
            {status && (
              <div className={`mt-2.5 flex items-center gap-2 text-sm animate-fade-in-fast
                              ${status.ok ? 'text-accent-green' : 'text-accent-red'}`}>
                <span className="font-bold">{status.ok ? 'OK' : '!'}</span>
                <span>{status.msg}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

