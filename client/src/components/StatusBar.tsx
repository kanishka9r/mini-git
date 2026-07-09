import { useStore } from '../store/useStore';

export default function StatusBar() {
  const { isInitialized, isLoggedIn, remoteOwner, remoteRepo } = useStore();

  return (
    <footer className="statusbar flex items-center justify-between gap-4 px-5 py-1.5 bg-bg-secondary/95 border-t border-border text-xs transition-colors duration-300">
      <div className="flex items-center gap-4 text-text-muted min-w-0">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className={`w-1.5 h-1.5 rounded-full ${isInitialized ? 'bg-accent-green' : 'bg-text-muted'}`} />
          <span className={isInitialized ? 'text-text-secondary' : ''}>
            {isInitialized ? 'Repository active' : 'No repository'}
          </span>
        </span>
        {isInitialized && remoteOwner && remoteRepo && (
          <span className="font-mono text-text-muted truncate max-w-[200px]">{remoteOwner}/{remoteRepo}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 whitespace-nowrap text-text-muted">
        <span className={`w-1.5 h-1.5 rounded-full ${isLoggedIn ? 'bg-accent-green' : 'bg-text-muted'}`} />
        <span>{isLoggedIn ? 'GitHub connected' : 'Offline'}</span>
      </div>
    </footer>
  );
}
