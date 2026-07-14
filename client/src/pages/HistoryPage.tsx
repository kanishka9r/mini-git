import { useState, useEffect } from 'react';
import { vcsClient } from '../api/vcsClient';
import { useStore } from '../store/useStore';
import type { CommitEntry, DiffLine } from '../types';

function DiffViewer({ lines }: { lines: DiffLine[] }) {
  return (
    <pre className="font-mono text-[11px] p-4 bg-bg-primary overflow-x-auto h-full m-0 selection:bg-accent-blue/30">
      {lines.map((line, i) => (
        <div key={i} className={`whitespace-pre ${
          line.type === '+' ? 'diff-added' : line.type === '-' ? 'diff-removed' : 'diff-context'
        }`}>
          {line.type} {line.text}
        </div>
      ))}
    </pre>
  );
}

function CommitCard({
  commit, isSelected, isLatest, onClick, compareMode
}: {
  commit: CommitEntry;
  isSelected: boolean;
  isLatest: boolean;
  onClick: () => void;
  compareMode: boolean;
}) {
  const date = new Date(commit.timestamp * 1000);
  const dateStr = date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center flex-shrink-0 pt-4.5">
        <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
          isLatest && !compareMode
            ? 'bg-accent-green border-accent-green'
            : isSelected
              ? 'bg-accent-blue border-accent-blue'
              : 'bg-bg-primary border-border'
        }`} />
        <div className="w-px flex-1 bg-border mt-1.5" />
      </div>

      <button
        onClick={onClick}
        className={`flex-1 text-left mb-3 p-5 rounded-lg border transition-all duration-200 cursor-pointer group
                    ${isSelected
                      ? 'bg-accent-blue/5 border-accent-blue/30 shadow-sm'
                      : 'bg-bg-secondary border-border hover:border-text-secondary/30 hover:bg-bg-tertiary/20'
                    }`}
      >
        <p className="text-text-primary font-semibold text-sm truncate">{commit.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-text-muted font-mono text-xs">{commit.hash.substring(0, 7)}</span>
          <span className="text-border">-</span>
          <span className="text-text-muted text-xs">{dateStr}</span>
          <span className="text-border">-</span>
          <span className="text-text-muted text-xs">{commit.fileCount} file{commit.fileCount !== 1 ? 's' : ''}</span>
          {isLatest && (
            <span className="px-2 py-0.5 bg-accent-green/10 border border-accent-green/20 text-accent-green rounded text-xs font-semibold uppercase tracking-wider">
              Latest
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<CommitEntry[]>([]);
  const [selected, setSelected] = useState<CommitEntry | null>(null);
  
  // Compare Mode State
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
  const [changedFiles, setChangedFiles] = useState<{ filename: string, status: string, oldHash: string, newHash: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ filename: string, oldHash: string, newHash: string } | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const [reverting, setReverting] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshStatus, isInitialized } = useStore();

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await vcsClient.log();
      setHistory(data);
    } catch { setHistory([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    Promise.resolve().then(() => {
      loadHistory();
      interval = setInterval(loadHistory, 3000);
    });
    return () => clearInterval(interval);
  }, []);

  // Compute changed files when 2 commits are selected
  useEffect(() => {
    if (compareMode && selectedCommits.length === 2) {
      const commitA = history.find(c => c.hash === selectedCommits[0]);
      const commitB = history.find(c => c.hash === selectedCommits[1]);
      if (commitA && commitB) {
        // Sort chronologically
        const [oldC, newC] = commitA.timestamp < commitB.timestamp ? [commitA, commitB] : [commitB, commitA];
        
        const newChangedFiles = [];
        const oldFiles = oldC.files || {};
        const newFiles = newC.files || {};
        
        for (const [filename, oldHash] of Object.entries(oldFiles)) {
            const newHash = newFiles[filename];
            if (!newHash) {
                newChangedFiles.push({ filename, status: 'deleted', oldHash, newHash: '' });
            } else if (oldHash !== newHash) {
                newChangedFiles.push({ filename, status: 'modified', oldHash, newHash });
            }
        }
        for (const [filename, newHash] of Object.entries(newFiles)) {
            if (!oldFiles[filename]) {
                newChangedFiles.push({ filename, status: 'added', oldHash: '', newHash });
            }
        }
        
        setChangedFiles(newChangedFiles.sort((a, b) => a.filename.localeCompare(b.filename)));
      }
    } else {
      setChangedFiles([]);
      setSelectedFile(null);
      setDiffLines([]);
    }
  }, [selectedCommits, compareMode, history]);

  async function handleFileClick(f: typeof changedFiles[0]) {
    setSelectedFile(f);
    setLoadingDiff(true);
    try {
      const diff = await vcsClient.diff(f.oldHash, { newHash: f.newHash });
      setDiffLines(diff);
    } catch {
      setDiffLines([]);
    }
    setLoadingDiff(false);
  }

  function handleCommitClick(hash: string) {
    if (compareMode) {
      if (selectedCommits.includes(hash)) {
        setSelectedCommits(prev => prev.filter(h => h !== hash));
      } else if (selectedCommits.length < 2) {
        setSelectedCommits(prev => [...prev, hash]);
      }
    } else {
      const commit = history.find(c => c.hash === hash) || null;
      setSelected(commit);
    }
  }

  function toggleCompareMode() {
    setCompareMode(!compareMode);
    setSelectedCommits([]);
    setChangedFiles([]);
    setSelectedFile(null);
    setDiffLines([]);
  }

  async function handleRevert() {
    if (!selected) return;
    if (!confirm(`Revert to commit "${selected.message}"?\n\nA new revert commit will be created.`)) return;

    setReverting(true);
    setStatus(null);
    try {
      const res = await vcsClient.revert(selected.hash);
      if (!res.success) throw new Error(res.message);

      setStatus({
        msg: res.newHash
          ? `Reverted. New commit: ${res.newHash.substring(0, 8)}`
          : res.message,
        ok: true,
      });
      await loadHistory();
      await refreshStatus();
      setSelected(null);
    } catch (e) {
      const err = e as Error;
      setStatus({ msg: err.message || 'Revert failed', ok: false });
    } finally {
      setReverting(false);
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-8 py-6 flex items-center justify-between flex-shrink-0 border-b border-border bg-bg-secondary/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">History</h1>
          <p className="text-text-secondary mt-0.5 text-sm">Commit timeline and version restore</p>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <span className="px-3 py-1 bg-accent-blue/10 text-accent-blue text-xs font-semibold rounded-full border border-accent-blue/20">
              {history.length} commit{history.length !== 1 ? 's' : ''}
            </span>
          )}
          
          <button
            onClick={toggleCompareMode}
            className={`px-4 py-2 border rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer
              ${compareMode 
                ? 'bg-accent-blue/10 border-accent-blue text-accent-blue shadow-sm' 
                : 'bg-bg-tertiary border-border hover:bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
          >
            {compareMode ? 'Exit Compare Mode' : 'Compare Commits'}
          </button>

          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-bg-tertiary border border-border hover:bg-bg-hover
                       text-text-secondary hover:text-text-primary rounded-lg text-xs font-semibold
                       transition-all duration-200 cursor-pointer"
          >
             Refresh
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
      ) : loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-border border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5 flex-1 min-h-0 px-8 py-5">
          <div className="flex-1 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-16 text-center">
                <p className="text-text-muted text-sm">No commits yet</p>
                <p className="text-text-muted text-xs mt-1">Go to Save to make your first commit</p>
              </div>
            ) : (
              history.map((commit, i) => (
                <CommitCard
                  key={commit.hash}
                  commit={commit}
                  isSelected={compareMode ? selectedCommits.includes(commit.hash) : selected?.hash === commit.hash}
                  isLatest={i === 0}
                  compareMode={compareMode}
                  onClick={() => handleCommitClick(commit.hash)}
                />
              ))
            )}
          </div>

          <div className={`${compareMode ? 'w-2/3' : 'w-96'} flex flex-col flex-shrink-0 transition-all duration-300`}>
            {compareMode ? (
              selectedCommits.length === 2 ? (
                <div className="card flex-1 flex flex-col min-h-0 shadow-sm border border-border overflow-hidden">
                   <div className="px-4 py-3 border-b border-border bg-bg-tertiary/55">
                     <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                        Changed Files ({changedFiles.length})
                     </h3>
                   </div>
                   <div className={`overflow-y-auto ${selectedFile ? 'h-1/3 border-b border-border' : 'flex-1'} p-2 space-y-1`}>
                       {changedFiles.length === 0 && (
                         <div className="p-4 text-text-muted text-xs text-center italic">No files changed between these commits</div>
                       )}
                       {changedFiles.map(f => (
                           <button 
                             key={f.filename}
                             onClick={() => handleFileClick(f)}
                             className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors flex justify-between items-center cursor-pointer
                               ${selectedFile?.filename === f.filename ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-bg-tertiary text-text-primary'}`}
                           >
                              <span className="truncate">{f.filename}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                ${f.status === 'added' ? 'text-accent-green bg-accent-green/10' : 
                                  f.status === 'deleted' ? 'text-accent-red bg-accent-red/10' : 
                                  'text-accent-blue bg-accent-blue/10'}`}
                              >
                                {f.status}
                              </span>
                           </button>
                       ))}
                   </div>
                   
                   {selectedFile && (
                       <div className="flex-1 flex flex-col min-h-0">
                           <div className="px-4 py-2 border-b border-border bg-bg-tertiary flex items-center justify-between">
                             <h4 className="font-bold text-xs font-mono text-text-primary">{selectedFile.filename}</h4>
                           </div>
                           <div className="flex-1 overflow-hidden relative">
                              {loadingDiff ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-5 h-5 border-2 border-border border-t-accent-blue rounded-full animate-spin" />
                                </div>
                              ) : (
                                <DiffViewer lines={diffLines} />
                              )}
                           </div>
                       </div>
                   )}
                </div>
              ) : (
                <div className="card flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted">
                  <p className="text-sm font-semibold">Select 2 commits to view changes</p>
                  <p className="text-xs mt-1">({selectedCommits.length} selected)</p>
                </div>
              )
            ) : selected ? (
              <div className="flex-1 bg-bg-secondary border border-border rounded-lg overflow-hidden flex flex-col animate-fade-in shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-bg-tertiary/55">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Commit Details</h3>
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-5">
                  <p className="text-text-primary font-semibold text-sm leading-relaxed">{selected.message}</p>

                  <div className="space-y-3">
                    {[
                      { label: 'Hash', value: selected.hash.substring(0, 16), mono: true, color: 'text-accent-blue' },
                      { label: 'Date', value: new Date(selected.timestamp * 1000).toLocaleString(), mono: false, color: 'text-text-primary' },
                      { label: 'Files', value: `${selected.fileCount} file(s)`, mono: false, color: 'text-text-primary' },
                      { label: 'Parent', value: selected.parentHash ? selected.parentHash.substring(0, 8) : '(initial)', mono: true, color: selected.parentHash ? 'text-text-secondary' : 'text-text-muted' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-text-muted text-xs">{row.label}</span>
                        <span className={`${row.color} text-xs ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Snapshot</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {Object.keys(selected.files).map((f) => (
                        <div key={f} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-border flex-shrink-0" />
                          <span className="font-mono text-xs text-text-secondary truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border space-y-3 bg-bg-tertiary/20">
                  {status && (
                    <div className={`flex items-center gap-2 text-sm animate-fade-in-fast
                                    ${status.ok ? 'text-accent-green' : 'text-accent-red'}`}>
                      <span className="font-bold">{status.ok ? 'OK' : '!'}</span>
                      <span>{status.msg}</span>
                    </div>
                  )}
                  <button
                    onClick={handleRevert}
                    disabled={reverting}
                    className="w-full py-3 bg-transparent border border-accent-red/20 text-accent-red
                               hover:bg-accent-red/5 font-semibold rounded-lg text-sm
                               transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {reverting ? 'Reverting' : 'Revert to This Version'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
