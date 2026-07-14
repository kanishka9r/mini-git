import { useState, useEffect, useCallback } from 'react';
import { vcsClient } from '../api/vcsClient';
import { useStore } from '../store/useStore';
import type { DiffLine, StagingStatusResponse } from '../types';

// ─── Diff Viewer ─────────────────────────────────────────────────────────────
function DiffViewer({ lines }: { lines: DiffLine[] }) {
  if (lines.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-text-muted text-xs">No changes to preview</p>
    </div>
  );
  return (
    <div className="font-mono text-xs overflow-auto h-full p-4 space-y-px">
      {lines.map((line, i) => (
        <div key={i} className={`px-3 py-0.5 whitespace-pre-wrap leading-5 rounded-sm ${
          line.type === '+' ? 'diff-added' : line.type === '-' ? 'diff-removed' : 'diff-context'
        }`}>
          <span className="select-none mr-3 opacity-30 inline-block w-3 text-right">
            {line.type === '+' ? '+' : line.type === '-' ? '-' : ' '}
          </span>
          {line.text}
        </div>
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SectionKey = 'staged' | 'unstaged' | 'untracked' | 'tracked';

const statusBadge: Record<string, string> = {
  added:    'bg-accent-green/10 text-accent-green border-accent-green/20',
  modified: 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20',
  deleted:  'bg-accent-red/10 text-accent-red border-accent-red/20',
};
const statusDot: Record<string, string> = {
  added: 'bg-accent-green', modified: 'bg-accent-yellow', deleted: 'bg-accent-red',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function SavePage() {
  const [statusData, setStatusData]     = useState<StagingStatusResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionKey | null>(null);
  const [diffLines, setDiffLines]       = useState<DiffLine[]>([]);
  const [message, setMessage]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [opStatus, setOpStatus]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(['staged', 'unstaged', 'untracked'])
  );
  const { refreshStatus, isInitialized } = useStore();

  const loadChanges = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await vcsClient.stagingStatus();
      setStatusData(data);
      setSelectedFile(null); setSelectedSection(null); setDiffLines([]);
    } catch { void 0; }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { Promise.resolve().then(loadChanges); }, [loadChanges]);

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  async function handleFileClick(filename: string, oldHash: string, section: SectionKey) {
    setSelectedFile(filename); setSelectedSection(section); setDiffLines([]);
    try { setDiffLines(await vcsClient.diff(oldHash, filename)); } catch { setDiffLines([]); }
  }

  async function runOp(fn: () => Promise<any>, successMsg?: string) {
    setOpStatus(null);
    try {
      await fn();
      if (successMsg) setOpStatus({ msg: successMsg, ok: true });
      await loadChanges();
    } catch (e: any) {
      setOpStatus({ msg: e.message || 'Operation failed', ok: false });
    }
  }

  async function handleSave() {
    if (!message.trim()) { setOpStatus({ msg: 'Please enter a commit message.', ok: false }); return; }
    if (!statusData?.staged.length) { setOpStatus({ msg: 'No files staged. Add files to staging first.', ok: false }); return; }
    setSaving(true); setOpStatus(null);
    try {
      const res = await vcsClient.commit(message.trim());
      if (!res.success) throw new Error(res.message || 'Commit failed');
      setOpStatus({ msg: `Committed ${res.hash?.substring(0, 8)}`, ok: true });
      setMessage(''); await loadChanges(); await refreshStatus();
    } catch (e) {
      setOpStatus({ msg: (e as Error).message || 'Save failed', ok: false });
    } finally { setSaving(false); }
  }

  const getItems = (key: SectionKey): { filename: string; oldHash: string; status?: string }[] => {
    if (!statusData) return [];
    switch (key) {
      case 'staged':    return statusData.staged.map(c => ({ filename: c.filename, oldHash: c.oldHash, status: c.status }));
      case 'unstaged':  return statusData.unstaged.map(c => ({ filename: c.filename, oldHash: c.oldHash, status: c.status }));
      case 'untracked': return statusData.untracked.map(f => ({ filename: f, oldHash: '' }));
      case 'tracked':   return statusData.tracked.map(f => ({ filename: f, oldHash: 'HEAD' }));
    }
  };

  // ─── Section config ───────────────────────────────────────────────────────
  const sections: {
    key: SectionKey;
    label: string;
    subtitle: string;
    emptyMsg: string;
    accentClass: string;
    countClass: string;
  }[] = [
    {
      key: 'staged',
      label: 'Staged',
      subtitle: 'Will be included in the next commit',
      emptyMsg: 'No files staged — add files from below.',
      accentClass: 'text-accent-green',
      countClass: 'bg-accent-green/10 text-accent-green border-accent-green/20',
    },
    {
      key: 'unstaged',
      label: 'Unstaged Changes',
      subtitle: 'Modified files not yet marked for commit',
      emptyMsg: 'No unstaged changes.',
      accentClass: 'text-accent-yellow',
      countClass: 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20',
    },
    {
      key: 'untracked',
      label: 'New Files',
      subtitle: 'New files created on disk (Untracked)',
      emptyMsg: 'No new files detected.',
      accentClass: 'text-text-muted',
      countClass: 'bg-bg-tertiary text-text-muted border-border',
    },
    {
      key: 'tracked',
      label: 'All Tracked Files',
      subtitle: 'Every file currently watched by Mini-Git',
      emptyMsg: 'No tracked files.',
      accentClass: 'text-text-secondary',
      countClass: 'bg-bg-tertiary text-text-muted border-border',
    },
  ];

  // ─── File row ─────────────────────────────────────────────────────────────
  const FileRow = ({
    filename, oldHash, section, status,
  }: { filename: string; oldHash: string; section: SectionKey; status?: string }) => {
    const isSelected = selectedFile === filename && selectedSection === section;

    return (
      <div
        onClick={() => handleFileClick(filename, oldHash, section)}
        role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleFileClick(filename, oldHash, section)}
        className={`group cursor-pointer transition-all duration-150 rounded-lg border mb-1 mx-2
                    ${isSelected
                      ? 'bg-accent-blue/5 border-accent-blue/30'
                      : 'bg-bg-secondary border-border hover:border-text-secondary/30 hover:bg-bg-tertiary/30'
                    }`}
      >
        {/* File info row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status ? statusDot[status] : 'bg-text-muted'}`} />
          <span className="font-mono text-xs text-text-primary truncate flex-1 min-w-0">{filename}</span>
          {status && (
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${statusBadge[status]}`}>
              {status}
            </span>
          )}
        </div>

        {/* Action row — shown on hover or selection */}
        <div className={`px-3 pb-2.5 flex items-center gap-1.5 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}>
          {section === 'staged' && (
            <button
              onClick={(e) => { e.stopPropagation(); runOp(() => vcsClient.unstage(filename)); }}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-border
                         bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary
                         transition-colors cursor-pointer"
            >
              Unstage
            </button>
          )}
          {(section === 'unstaged' || section === 'untracked') && (
            <button
              onClick={(e) => { e.stopPropagation(); runOp(() => vcsClient.add([filename])); }}
              className="px-3 py-1 text-xs font-semibold rounded-md
                         bg-btn-blue hover:bg-btn-blue-hover text-white
                         transition-colors cursor-pointer shadow-sm"
            >
              {section === 'untracked' ? 'Track / Stage' : status === 'deleted' ? 'Stage deletion' : 'Stage'}
            </button>
          )}
          {section === 'tracked' && (
            <button
              onClick={(e) => { e.stopPropagation(); runOp(() => vcsClient.untrack(filename), `Stopped tracking ${filename}`); }}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-accent-red/20
                         bg-transparent hover:bg-accent-red/5 text-accent-red
                         transition-colors cursor-pointer"
            >
              Stop Tracking
            </button>
          )}
          <span className="ml-auto text-xs text-text-muted">click to preview</span>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between flex-shrink-0 border-b border-border bg-bg-secondary/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Staging & Commit</h1>
          <p className="text-text-secondary mt-0.5 text-sm">Review your changes, stage files, then commit</p>
        </div>
        <div className="flex items-center gap-3">
          {statusData && statusData.staged.length > 0 && (
            <span className="px-3 py-1 bg-accent-green/10 text-accent-green rounded-full text-xs font-semibold border border-accent-green/20">
              {statusData.staged.length} staged
            </span>
          )}
          <button onClick={loadChanges} disabled={refreshing}
            className="px-4 py-2 bg-bg-tertiary border border-border hover:bg-bg-hover
                       text-text-secondary hover:text-text-primary rounded-lg text-xs font-semibold
                       transition-all duration-200 cursor-pointer disabled:opacity-40">
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
        <div className="flex flex-1 min-h-0">

          {/* ── Left: File sections ── */}
          <div className="w-80 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-bg-secondary/30">
            <div className="flex-1 overflow-y-auto py-4">
              {sections.map(({ key, label, subtitle, emptyMsg, accentClass, countClass }) => {
                const items = getItems(key);
                const isOpen = openSections.has(key);
                return (
                  <div key={key} className="mb-1 px-2">
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                                 text-left hover:bg-bg-tertiary/60 transition-colors cursor-pointer group"
                    >
                      <span className={`text-xs transition-transform duration-200 text-text-muted flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>{label}</span>
                      </div>
                      {items.length > 0 && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${countClass}`}>
                          {items.length}
                        </span>
                      )}
                    </button>

                    {/* Section description */}
                    {isOpen && (
                      <div className="mb-1">
                        <p className="text-xs text-text-muted px-3 pb-1.5 leading-relaxed">{subtitle}</p>
                        {items.length === 0 ? (
                          <p className="text-xs text-text-muted/70 px-3 py-2 italic">{emptyMsg}</p>
                        ) : (
                          <div>
                            {items.map(item => (
                              <FileRow
                                key={item.filename + key}
                                filename={item.filename}
                                oldHash={item.oldHash}
                                section={key}
                                status={item.status}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Diff + Commit ── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">

            {/* Diff header */}
            <div className="px-5 py-3 border-b border-border bg-bg-secondary/40 flex items-center gap-3 flex-shrink-0">
              {selectedFile ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    selectedSection === 'staged' ? 'bg-accent-green' :
                    selectedSection === 'unstaged' ? 'bg-accent-yellow' : 'bg-text-muted'
                  }`} />
                  <span className="font-mono text-xs text-text-primary truncate flex-1">{selectedFile}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${
                    selectedSection === 'staged' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
                    selectedSection === 'unstaged' ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20' :
                    'bg-bg-tertiary text-text-muted border-border'
                  }`}>
                    {selectedSection}
                  </span>
                  {/* Quick actions in diff header too */}
                  <div className="flex gap-1.5 flex-shrink-0 ml-1">
                    {selectedSection === 'staged' && (
                      <button onClick={() => runOp(() => vcsClient.unstage(selectedFile!))}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border
                                   bg-bg-tertiary hover:bg-bg-hover text-text-secondary transition-colors cursor-pointer">
                        Unstage
                      </button>
                    )}
                    {(selectedSection === 'unstaged' || selectedSection === 'untracked') && (
                      <button onClick={() => runOp(() => vcsClient.add([selectedFile!]))}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md
                                   bg-btn-blue hover:bg-btn-blue-hover text-white transition-colors cursor-pointer">
                        {selectedSection === 'untracked' ? 'Track / Stage' : 'Stage'}
                      </button>
                    )}
                    {selectedSection === 'tracked' && (
                      <button onClick={() => runOp(() => vcsClient.untrack(selectedFile!), `Stopped tracking ${selectedFile}`)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-accent-red/20
                                   bg-transparent hover:bg-accent-red/5 text-accent-red transition-colors cursor-pointer">
                        Stop Tracking
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-xs text-text-muted">Select a file on the left to preview its changes</span>
              )}
            </div>

            {/* Diff content */}
            <div className="flex-1 overflow-auto">
              {selectedFile ? (
                <DiffViewer lines={diffLines} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <p className="text-sm text-text-muted">No file selected</p>
                  <p className="text-xs text-text-muted/60">Click a file on the left to see what changed</p>
                </div>
              )}
            </div>

            {/* Commit bar */}
            <div className="border-t border-border bg-bg-secondary/50 px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="Describe your changes — e.g. 'Fix login bug' or 'Add dark mode'"
                    className="w-full px-4 py-2.5 bg-bg-primary border border-border rounded-lg
                               text-text-primary text-sm placeholder-text-muted/40
                               focus:border-border-active transition-colors duration-200 outline-none"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !statusData?.staged.length}
                  className="px-5 py-2.5 bg-btn-blue hover:bg-btn-blue-hover
                             disabled:bg-bg-tertiary disabled:text-text-muted
                             text-white font-semibold rounded-lg text-sm transition-all duration-200
                             cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Committing
                    </span>
                  ) : 'Commit Changes'}
                </button>
              </div>

              {!statusData?.staged.length && !saving && (
                <p className="text-xs text-text-muted mt-2">
                  Stage files above before committing — use <span className="font-semibold text-btn-blue">"Add to Staging"</span> on any changed or new file.
                </p>
              )}

              {opStatus && (
                <div className={`mt-2 flex items-center gap-2 text-sm animate-fade-in-fast
                                 ${opStatus.ok ? 'text-accent-green' : 'text-accent-red'}`}>
                  <span className="font-bold">{opStatus.ok ? 'OK' : '!'}</span>
                  <span>{opStatus.msg}</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
