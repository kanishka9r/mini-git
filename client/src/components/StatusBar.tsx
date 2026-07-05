import { useStore } from '../store/useStore';

export default function StatusBar() {
  const { isInitialized, currentBranch, headCommit, isLoggedIn, username, remoteRepo } = useStore();

  return (
    <footer className="statusbar flex items-center justify-between gap-4 px-5 py-2 bg-bg-secondary/95 border-t border-border text-xs transition-colors duration-300">
      <div className="flex items-center gap-5 text-text-muted min-w-0">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-accent-green' : 'bg-text-muted'}`} />
          <span className={isInitialized ? 'text-text-secondary font-medium' : ''}>
            {isInitialized ? 'Repository' : 'No repository'}
          </span>
        </span>

        {isInitialized && currentBranch && (
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            <span className="text-accent-blue font-mono truncate">{currentBranch}</span>
          </span>
        )}

        {isInitialized && headCommit && (
          <span className="font-mono text-text-secondary whitespace-nowrap">{headCommit.substring(0, 7)}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-text-muted min-w-0">
        {remoteRepo && (
          <span className="font-mono text-text-secondary truncate max-w-[220px]">{remoteRepo}</span>
        )}
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className={`w-2 h-2 rounded-full ${isLoggedIn ? 'bg-accent-green' : 'bg-text-muted'}`} />
          <span className={isLoggedIn ? 'text-text-secondary font-medium' : ''}>
            {isLoggedIn ? username : 'Offline'}
          </span>
        </span>
      </div>
    </footer>
  );
}
