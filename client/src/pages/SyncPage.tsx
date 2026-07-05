import { useState } from 'react';
import { vcsClient } from '../api/vcsClient';
import { githubClient } from '../api/githubClient';
import { useStore } from '../store/useStore';
import type { SyncLog } from '../types';

function LogLine({ entry }: { entry: SyncLog }) {
  const styles: Record<SyncLog['type'], { color: string; icon: string }> = {
    info: { color: 'text-accent-blue', icon: 'INFO' },
    success: { color: 'text-accent-green', icon: 'OK' },
    error: { color: 'text-accent-red', icon: 'ERR' },
    progress: { color: 'text-text-secondary', icon: 'RUN' },
  };
  const s = styles[entry.type];

  return (
    <div className={`grid grid-cols-[4.5rem_2.5rem_1fr] gap-3 text-xs font-mono py-1.5 ${s.color} animate-slide-in`}>
      <span className="text-text-muted">{entry.timestamp}</span>
      <span className="font-semibold">{s.icon}</span>
      <span className="break-words">{entry.message}</span>
    </div>
  );
}

export default function SyncPage() {
  const { token, isLoggedIn, remoteOwner, remoteRepo, currentBranch,
          addSyncLog, clearSyncLogs, setSyncing, setSyncProgress,
          isSyncing, syncProgress, syncLogs, refreshStatus } = useStore();

  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  function log(message: string, type: SyncLog['type'] = 'progress') {
    addSyncLog(message, type);
  }

  async function handleSync() {
    if (!isLoggedIn) { setStatus({ msg: 'Not logged in. Please connect GitHub first.', ok: false }); return; }
    if (!remoteOwner || !remoteRepo) { setStatus({ msg: 'No remote configured. Create a project first.', ok: false }); return; }

    setSyncing(true);
    setSyncProgress(0);
    clearSyncLogs();
    setStatus(null);

    try {
      log('Starting sync', 'info');
      setSyncProgress(10);

      log('Fetching local commits', 'progress');
      const history = await vcsClient.log();
      if (history.length === 0) {
        log('No local commits to sync.', 'error');
        setStatus({ msg: 'No local commits to sync.', ok: false });
        return;
      }

      const localCommit = history[0];
      setSyncProgress(20);

      log('Checking remote branch', 'progress');
      const remoteRef = await githubClient.getRef(token, remoteOwner, remoteRepo, currentBranch || 'main');
      setSyncProgress(30);

      log('Uploading files', 'info');
      const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];
      const fileEntries = Object.entries(localCommit.files);

      for (let i = 0; i < fileEntries.length; i++) {
        const [filename, hash] = fileEntries[i];
        const { content } = await vcsClient.object(hash);
        const blob = await githubClient.createBlob(token, remoteOwner, remoteRepo, content);
        treeEntries.push({ path: filename, mode: '100644', type: 'blob', sha: blob.sha });

        const pct = 30 + Math.round(((i + 1) / fileEntries.length) * 30);
        setSyncProgress(pct);
        log(`Uploaded: ${filename}`, 'progress');
      }

      log('Creating tree', 'info');
      const tree = await githubClient.createTree(token, remoteOwner, remoteRepo, treeEntries);
      setSyncProgress(70);

      log('Creating remote commit', 'info');
      const ghCommit = await githubClient.createCommit(
        token, remoteOwner, remoteRepo,
        localCommit.message, tree.sha,
        remoteRef?.object.sha,
      );
      setSyncProgress(85);

      log('Updating remote branch', 'info');
      const branch = currentBranch || 'main';
      if (remoteRef) {
        await githubClient.updateRef(token, remoteOwner, remoteRepo, branch, ghCommit.sha);
      } else {
        await githubClient.createRef(token, remoteOwner, remoteRepo, branch, ghCommit.sha);
      }
      setSyncProgress(100);

      log(`Sync complete! SHA: ${ghCommit.sha.substring(0, 8)}`, 'success');
      setStatus({ msg: 'Successfully synced to GitHub', ok: true });
      await refreshStatus();

    } catch (e) {
      const err = e as Error;
      log(err.message || 'Sync failed', 'error');
      setStatus({ msg: err.message || 'Sync failed', ok: false });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-8 animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sync</h1>
        <p className="text-text-secondary mt-1 text-sm">Push your repository to GitHub</p>
      </div>

      <div className="card">
        <div className="flex flex-col items-center text-center py-8 space-y-7">
          <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-lg font-extrabold transition-all duration-300 border ${
            isSyncing ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue animate-pulse' : 'bg-bg-tertiary border-border text-accent-blue'
          }`}>
            {isSyncing ? 'SYNC' : syncProgress === 100 ? 'DONE' : 'PUSH'}
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`px-10 py-3 font-semibold rounded-lg text-white text-sm transition-all duration-300 cursor-pointer disabled:cursor-not-allowed ${
              isSyncing ? 'bg-bg-tertiary text-text-muted' : 'bg-btn-blue hover:bg-btn-blue-hover shadow-sm'
            }`}
          >
            {isSyncing ? 'Syncing' : 'Sync Now'}
          </button>

          {(isSyncing || syncProgress > 0) && (
            <div className="w-full max-w-sm space-y-2 animate-fade-in-fast">
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-btn-blue rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <p className="text-text-muted text-xs font-mono">{syncProgress}%</p>
            </div>
          )}

          {status && (
            <div className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold animate-fade-in-fast ${
              status.ok
                ? 'bg-accent-green/5 text-accent-green border border-accent-green/20'
                : 'bg-accent-red/5 text-accent-red border border-accent-red/20'
            }`}>
              <span>{status.ok ? 'OK' : '!'}</span>
              <span>{status.msg}</span>
            </div>
          )}

          {remoteOwner && remoteRepo && (
            <p className="text-text-muted text-xs font-mono">
              {remoteOwner}/{remoteRepo}
            </p>
          )}
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-bg-tertiary/55">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Sync Log</h3>
        </div>
        <div className="p-5 min-h-[140px] max-h-64 overflow-y-auto">
          {syncLogs.length === 0 ? (
            <p className="text-text-muted text-xs font-mono">Waiting for sync</p>
          ) : (
            syncLogs.map((entry, i) => <LogLine key={i} entry={entry} />)
          )}
        </div>
      </div>
    </div>
  );
}
