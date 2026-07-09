import { useState, useEffect } from 'react';
import { vcsClient } from '../api/vcsClient';
import { githubClient } from '../api/githubClient';
import { useStore } from '../store/useStore';
import type { CommitEntry } from '../types';

export default function DashboardPage() {
  const [projectName, setProjectName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState<Array<{ msg: string; type: 'info' | 'success' | 'error' }>>([]);
  const [recentCommits, setRecentCommits] = useState<CommitEntry[]>([]);
  const [error, setError] = useState('');

  const { isInitialized, isLoggedIn, token, currentBranch,
          setRemote, refreshStatus, loadConfig, remoteOwner, remoteRepo, username,
          workspacePath, setWorkspacePath } = useStore();

  const [inputWorkspace, setInputWorkspace] = useState(workspacePath);
  const [workspaceError, setWorkspaceError] = useState('');
  const [prevWorkspacePath, setPrevWorkspacePath] = useState(workspacePath);
  if (workspacePath !== prevWorkspacePath) {
    setPrevWorkspacePath(workspacePath);
    setInputWorkspace(workspacePath);
  }

  useEffect(() => { loadConfig(); refreshStatus(); }, [loadConfig, refreshStatus]);

  useEffect(() => {
    async function loadHistory() {
      try { const h = await vcsClient.log(); setRecentCommits(h.slice(0, 4)); } catch { return; }
    }
    if (isInitialized) loadHistory();
  }, [isInitialized]);

  function appendLog(msg: string, type: 'info' | 'success' | 'error' = 'info') {
    setLog((prev) => [...prev, { msg, type }]);
  }

  async function handleSetWorkspace() {
    try {
      setWorkspaceError('');
      await setWorkspacePath(inputWorkspace.trim());
    } catch (e) { setWorkspaceError((e as Error).message); }
  }

  async function handleCreate() {
    const name = projectName.trim();
    if (!name) { setError('Enter a project name.'); return; }
    if (name.includes(' ')) { setError('No spaces in project name.'); return; }
    if (!isLoggedIn) { setError('Log in to GitHub first.'); return; }

    setCreating(true); setError(''); setLog([]);
    try {
      appendLog('Initializing local repository…', 'info');
      await vcsClient.init();
      appendLog('Local .vcs/ created', 'success');
      appendLog(`Creating GitHub repo "${name}"…`, 'info');
      const repo = await githubClient.createRepo(token, name, isPrivate);
      appendLog(`GitHub repo ready`, 'success');
      await vcsClient.setRemote(repo.owner.login, repo.name, repo.html_url);
      setRemote(repo.owner.login, repo.name, repo.html_url);
      appendLog('Done! Head to Save for your first commit.', 'success');
      setProjectName('');
    } catch (e) {
      const err = e as Error;
      appendLog(err.message || 'Failed', 'error');
      setError(err.message || 'Creation failed.');
    } finally { await refreshStatus(); setCreating(false); }
  }

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const logColors = { info: 'text-accent-blue', success: 'text-accent-green', error: 'text-accent-red' };
  const logIcons = { info: '›', success: '✓', error: '!' };

  return (
    <div className="h-full flex flex-col px-6 py-5 gap-4 animate-fade-in overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-text-muted text-xs mt-0.5">
            {isLoggedIn ? <>Welcome, <span className="text-accent-blue font-semibold">{username}</span></> : 'Repository overview'}
          </p>
        </div>
        {/* Status chips */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${isInitialized ? 'bg-accent-green/10 text-accent-green border-accent-green/20' : 'bg-bg-tertiary text-text-muted border-border'}`}>
            {isInitialized ? 'Repo Active' : 'No Repo'}
          </span>
          {currentBranch && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-accent-blue/10 text-accent-blue border-accent-blue/20 font-mono">
              {currentBranch}
            </span>
          )}
          {remoteRepo && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-bg-tertiary text-text-secondary border-border font-mono truncate max-w-[160px]">
              {remoteOwner}/{remoteRepo}
            </span>
          )}
        </div>
      </div>

      {/* Workspace bar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          value={inputWorkspace}
          onChange={(e) => { setInputWorkspace(e.target.value); setWorkspaceError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSetWorkspace()}
          placeholder="Workspace path, e.g. C:\Projects\my-app"
          className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded-lg
                     text-text-primary text-xs placeholder-text-muted/40
                     focus:border-border-active transition-colors duration-200 font-mono"
        />
        <button onClick={handleSetWorkspace}
          className="px-4 py-2 bg-bg-tertiary hover:bg-bg-hover text-text-primary text-xs font-semibold rounded-lg
                     transition-all duration-200 cursor-pointer border border-border whitespace-nowrap">
          Set Directory
        </button>
        {workspaceError && <p className="text-accent-red text-xs">{workspaceError}</p>}
      </div>

      {/* Main grid */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left: Recent Commits */}
        <div className="w-64 flex-shrink-0 bg-bg-secondary border border-border rounded-lg flex flex-col overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-border">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Recent Commits</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {recentCommits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <p className="text-text-muted text-xs">No commits yet</p>
                <p className="text-text-muted text-xs mt-1 opacity-60">Save changes to create one</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCommits.map((c, i) => (
                  <div key={c.hash} className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-accent-green' : 'bg-border'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-xs font-medium truncate">{c.message}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-text-muted font-mono text-xs">{c.hash.substring(0, 7)}</span>
                        <span className="text-border text-xs">·</span>
                        <span className="text-text-muted text-xs">{formatDate(c.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Project setup or initialized state */}
        <div className="flex-1 bg-bg-secondary border border-border rounded-lg flex flex-col overflow-hidden shadow-sm">
          {!isInitialized || !remoteRepo ? (
            <>
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                  {isInitialized ? 'Connect to GitHub' : 'Start New Project'}
                </h2>
              </div>
              <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-widest">Project Name</label>
                  <input
                    value={projectName}
                    onChange={(e) => { setProjectName(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="my-awesome-project"
                    className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg
                               text-text-primary text-sm placeholder-text-muted/40
                               focus:border-border-active transition-colors duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-widest">Visibility</label>
                  <div className="flex gap-2">
                    {[{ value: false, label: 'Public' }, { value: true, label: 'Private' }].map((opt) => (
                      <button key={String(opt.value)} onClick={() => setIsPrivate(opt.value)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer
                          ${isPrivate === opt.value
                            ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                            : 'bg-bg-primary border-border text-text-muted hover:text-text-secondary hover:border-text-secondary/40'
                          }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 bg-accent-red/5 border border-accent-red/15 rounded-lg">
                    <span className="text-accent-red text-xs font-bold">!</span>
                    <p className="text-accent-red text-xs">{error}</p>
                  </div>
                )}

                <button onClick={handleCreate} disabled={creating}
                  className="w-full py-2.5 bg-btn-blue hover:bg-btn-blue-hover disabled:bg-bg-tertiary disabled:text-text-muted
                             text-white font-semibold rounded-lg text-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shadow-sm">
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…
                    </span>
                  ) : 'Create Project'}
                </button>

                {/* Activity Log inline */}
                {log.length > 0 && (
                  <div className="bg-bg-primary border border-border rounded-lg p-3 font-mono text-xs space-y-1">
                    {log.map((entry, i) => (
                      <div key={i} className={`flex items-center gap-2 ${logColors[entry.type]}`}>
                        <span className="flex-shrink-0">{logIcons[entry.type]}</span>
                        <span>{entry.msg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col p-5 gap-4">
              <div className="px-0 pt-0">
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Project</h2>
              </div>
              {/* Compact project info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Remote', value: `${remoteOwner}/${remoteRepo}`, color: 'text-accent-blue', mono: true },
                  { label: 'Branch', value: currentBranch || '-', color: 'text-accent-blue', mono: true },
                  { label: 'Status', value: 'Active', color: 'text-accent-green', dot: true },
                  { label: 'GitHub', value: isLoggedIn ? username : 'Not connected', color: isLoggedIn ? 'text-accent-green' : 'text-text-muted' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-bg-primary border border-border rounded-lg px-3 py-2.5">
                    <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={`text-sm font-bold truncate ${stat.color} ${stat.mono ? 'font-mono text-xs' : ''}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-accent-green/5 border border-accent-green/15 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 bg-accent-green/15 text-accent-green rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Repository Ready</p>
                  <p className="text-xs text-text-secondary mt-px">Go to <span className="text-accent-blue font-medium">Save</span> to stage and commit files.</p>
                </div>
              </div>

              {/* Recent commits preview */}
              {recentCommits.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">Latest Activity</p>
                  <div className="space-y-1.5">
                    {recentCommits.slice(0, 3).map((c, i) => (
                      <div key={c.hash} className="flex items-center gap-2.5 px-3 py-2 bg-bg-primary border border-border rounded-lg">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-accent-green' : 'bg-border'}`} />
                        <span className="text-text-primary text-xs font-medium truncate flex-1">{c.message}</span>
                        <span className="text-text-muted font-mono text-xs flex-shrink-0">{c.hash.substring(0, 7)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
