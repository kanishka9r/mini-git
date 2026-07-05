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

  const { isInitialized, isLoggedIn, token, currentBranch, headCommit,
          setRemote, refreshStatus, loadConfig, remoteOwner, remoteRepo, username,
          workspacePath, setWorkspacePath } = useStore();

  const [inputWorkspace, setInputWorkspace] = useState(workspacePath);
  const [workspaceError, setWorkspaceError] = useState('');

  const [prevWorkspacePath, setPrevWorkspacePath] = useState(workspacePath);
  if (workspacePath !== prevWorkspacePath) {
    setPrevWorkspacePath(workspacePath);
    setInputWorkspace(workspacePath);
  }

  useEffect(() => {
    loadConfig();
    refreshStatus();
  }, [loadConfig, refreshStatus]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const h = await vcsClient.log();
        setRecentCommits(h.slice(0, 5));
      } catch { return; }
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
      appendLog('Workspace changed to ' + inputWorkspace.trim(), 'success');
    } catch (e) {
      const err = e as Error;
      setWorkspaceError(err.message);
      appendLog('Failed to change workspace: ' + err.message, 'error');
    }
  }

  async function handleCreate() {
    const name = projectName.trim();
    if (!name) { setError('Please enter a project name.'); return; }
    if (name.includes(' ')) { setError('Project name cannot contain spaces.'); return; }
    if (!isLoggedIn) { setError('Please log in to GitHub first.'); return; }

    setCreating(true);
    setError('');
    setLog([]);

    try {
      appendLog('Initializing local repository', 'info');
      await vcsClient.init();
      appendLog('Local .vcs/ repository created', 'success');

      appendLog(`Creating GitHub repository "${name}"`, 'info');
      const repo = await githubClient.createRepo(token, name, isPrivate);
      appendLog(`GitHub repository created: ${repo.html_url}`, 'success');

      await vcsClient.setRemote(repo.owner.login, repo.name, repo.html_url);
      setRemote(repo.owner.login, repo.name, repo.html_url);
      appendLog('Remote info saved', 'success');
      appendLog('Project ready! Go to Save to make your first commit.', 'success');

      setProjectName('');
    } catch (e) {
      const err = e as Error;
      appendLog(err.message || 'Failed', 'error');
      setError(err.message || 'Creation failed.');
    } finally {
      await refreshStatus();
      setCreating(false);
    }
  }

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

  const logColors = {
    info: 'text-accent-blue',
    success: 'text-accent-green',
    error: 'text-accent-red',
  };

  const logIcons = {
    info: '>',
    success: 'OK',
    error: '!',
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-8 animate-fade-in space-y-7">

      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1 text-sm">
          {isLoggedIn
            ? <>Welcome back, <span className="text-accent-blue font-semibold">{username}</span></>
            : 'Repository overview and project setup'}
        </p>
      </div>


      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-text-primary">Local Workspace</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={inputWorkspace}
            onChange={(e) => { setInputWorkspace(e.target.value); setWorkspaceError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSetWorkspace()}
            placeholder="e.g. C:\Projects\my-app"
            className="flex-1 px-4 py-3 bg-bg-primary border border-border rounded-lg
                       text-text-primary text-sm placeholder-text-muted/40
                       focus:border-border-active transition-colors duration-200 font-mono"
          />
          <button
            onClick={handleSetWorkspace}
            className="px-5 py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary font-medium rounded-lg text-sm
                       transition-all duration-200 cursor-pointer border border-border whitespace-nowrap"
          >
            Set Directory
          </button>
        </div>
        {workspaceError && (
          <p className="text-accent-red text-xs ml-1">{workspaceError}</p>
        )}
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Status',
            value: isInitialized ? 'Active' : 'Not init',
            color: isInitialized ? 'text-accent-green' : 'text-text-muted',
            dot: isInitialized ? 'bg-accent-green' : 'bg-text-muted',
          },
          {
            label: 'Branch',
            value: currentBranch || '-',
            color: 'text-accent-blue',
            dot: 'bg-accent-blue',
          },
          {
            label: 'HEAD',
            value: headCommit ? headCommit.substring(0, 7) : '-',
            color: 'text-text-secondary',
            dot: 'bg-text-muted',
            mono: true,
          },
          {
            label: 'Remote',
            value: remoteOwner && remoteRepo ? `${remoteOwner}/${remoteRepo}` : '-',
            color: 'text-text-secondary',
            dot: remoteRepo ? 'bg-accent-purple' : 'bg-text-muted',
            mono: true,
          },
        ].map((stat) => (
          <div key={stat.label} className="card !p-4">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stat.dot}`} />
              <span className={`text-lg font-bold ${stat.color} ${stat.mono ? 'font-mono text-sm font-semibold' : ''} truncate`}>
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        <div className="lg:col-span-2 card">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">Recent Commits</h2>
          {recentCommits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-text-muted text-sm">No commits yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCommits.map((c, i) => (
                <div key={c.hash} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    i === 0 ? 'bg-accent-green' : 'bg-border'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate leading-snug">{c.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-text-muted font-mono text-xs">{c.hash.substring(0, 7)}</span>
                      <span className="text-border text-xs">-</span>
                      <span className="text-text-muted text-xs">{formatDate(c.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        <div className="lg:col-span-3 card">
          {!isInitialized || !remoteRepo ? (
            <>
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-lg font-bold text-text-primary">
                  {isInitialized ? 'Connect to GitHub' : 'Start New Project'}
                </h2>
              </div>

              <div className="space-y-5">

                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-widest">
                    Project Name
                  </label>
                  <input
                    value={projectName}
                    onChange={(e) => { setProjectName(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="my-awesome-project"
                    className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg
                               text-text-primary text-sm placeholder-text-muted/40
                               focus:border-border-active transition-colors duration-200"
                  />
                </div>


                <div className="space-y-1.5">
                  <label className="block text-xs text-text-secondary font-semibold uppercase tracking-widest">
                    Visibility
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: false, icon: 'Public', label: 'Public' },
                      { value: true, icon: 'Private', label: 'Private' },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setIsPrivate(opt.value)}
                        className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer
                          ${isPrivate === opt.value
                            ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                            : 'bg-bg-primary border-border text-text-muted hover:border-text-secondary/40 hover:text-text-secondary'
                          }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-accent-red/5 border border-accent-red/10 rounded-lg">
                    <span className="text-accent-red text-sm font-bold">!</span>
                    <p className="text-accent-red text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full py-3 bg-btn-blue hover:bg-btn-blue-hover disabled:bg-bg-tertiary disabled:text-text-muted
                             text-white font-semibold rounded-lg text-sm transition-all duration-200
                             cursor-pointer disabled:cursor-not-allowed shadow-sm"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating
                    </span>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
              <div className="w-16 h-16 bg-accent-green/10 text-accent-green rounded-full flex items-center justify-center mb-5 border border-accent-green/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Project Initialized</h2>
              <p className="text-text-secondary text-sm mb-6 max-w-sm">
                Your repository is set up and ready to use. Head over to the Save page to commit your files.
              </p>
              {remoteRepo ? (
                <div className="px-4 py-2 bg-bg-tertiary rounded-lg border border-border inline-flex items-center gap-2">
                  <span className="text-xs text-text-muted font-semibold uppercase tracking-widest">Remote:</span>
                  <span className="text-sm font-mono text-accent-blue font-semibold">{remoteOwner}/{remoteRepo}</span>
                </div>
              ) : (
                <p className="text-sm text-text-muted">No remote configured.</p>
              )}
            </div>
          )}
        </div>
      </div>


      {log.length > 0 && (
        <div className="card animate-fade-in">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">Activity Log</h3>
          <div className="font-mono text-xs space-y-2">
            {log.map((entry, i) => (
              <div key={i} className={`flex items-start gap-2.5 ${logColors[entry.type]} animate-slide-in`}
                   style={{ animationDelay: `${i * 30}ms` }}>
                <span className="flex-shrink-0 w-4 text-center">{logIcons[entry.type]}</span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

