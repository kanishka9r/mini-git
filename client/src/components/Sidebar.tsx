import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { vcsClient } from '../api/vcsClient';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/login', icon: <KeyIcon />, label: 'Login' },
  { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
  { to: '/save', icon: <SaveIcon />, label: 'Save' },
  { to: '/sync', icon: <SyncIcon />, label: 'Sync' },
  { to: '/history', icon: <HistoryIcon />, label: 'History' },
];

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
function SyncIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
function BranchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export default function Sidebar() {
  const { isLoggedIn, username, isInitialized, currentBranch, refreshStatus } = useStore();
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (showBranchModal) {
      setLoadingBranches(true);
      vcsClient.branches()
        .then(res => setBranches(res.branches || []))
        .catch(err => console.error('Failed to load branches:', err))
        .finally(() => setLoadingBranches(false));
    }
  }, [showBranchModal]);

  const handleCreateBranch = async () => {
    if (!branchName.trim()) return;
    setLoading(true); setError('');
    try {
      await vcsClient.branch(branchName.trim());
      await vcsClient.checkout(branchName.trim());
      await refreshStatus();
      setShowBranchModal(false); setBranchName('');
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleCheckoutBranch = async (name: string) => {
    setLoading(true); setError('');
    try {
      await vcsClient.checkout(name);
      await refreshStatus();
      setShowBranchModal(false);
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <aside className="w-[210px] min-w-[210px] bg-bg-secondary/95 border-r border-border flex flex-col shadow-sm transition-colors duration-300">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-btn-blue flex items-center justify-center text-white text-sm font-bold shadow-[var(--shadow-soft)] flex-shrink-0">G</div>
          <div className="min-w-0">
            <h1 className="text-text-primary text-sm font-extrabold tracking-tight leading-tight">Mini-Git</h1>
            <p className="text-text-muted text-xs uppercase leading-tight mt-0.5">Version Control</p>
          </div>
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? 'bg-bg-tertiary text-text-primary border border-border shadow-sm'
                    : 'text-text-secondary border border-transparent hover:bg-bg-tertiary/70 hover:text-text-primary'
                }`
              }
            >
              <span className="flex-shrink-0 text-accent-blue">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 h-px bg-border" />

        {/* Bottom area */}
        <div className="px-2.5 py-3 space-y-2">
          {/* Branch — prominent, clearly clickable */}
          {isInitialized && currentBranch && (
            <button
              onClick={() => { setShowBranchModal(true); setBranchName(''); setError(''); }}
              title="Switch or create branch"
              className="w-full flex items-center gap-2 px-3 py-2 bg-accent-blue/10 hover:bg-accent-blue/20
                         border border-accent-blue/30 rounded-lg transition-all duration-150 cursor-pointer group"
            >
              <span className="text-accent-blue flex-shrink-0"><BranchIcon /></span>
              <span className="text-accent-blue font-mono text-xs font-bold truncate flex-1 text-left">{currentBranch}</span>
              <span className="text-accent-blue/50 group-hover:text-accent-blue transition-colors flex-shrink-0 opacity-70"><EditIcon /></span>
            </button>
          )}

          {/* User */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary/55 px-3 py-2">
              <div className="w-7 h-7 rounded-md bg-btn-blue flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary font-semibold truncate">{username}</p>
                <p className="text-xs text-accent-green flex items-center gap-1 mt-px">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block" />Connected
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary/55 px-3 py-2">
              <div className="w-7 h-7 rounded-md bg-bg-secondary flex items-center justify-center text-xs text-text-muted flex-shrink-0 border border-border">?</div>
              <span className="text-xs text-text-muted font-medium">Not connected</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-3 text-xs text-text-muted">v1.0.0</div>
      </aside>

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-bg-primary border border-border rounded-xl shadow-2xl w-[400px] max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-bg-secondary flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-bold text-text-primary text-sm">Switch Branch</h3>
                <p className="text-xs text-text-muted mt-0.5">Currently on <span className="text-accent-blue font-mono">{currentBranch}</span></p>
              </div>
              <button onClick={() => setShowBranchModal(false)} className="text-text-muted hover:text-text-primary text-lg leading-none cursor-pointer">✕</button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Available Branches</h4>
              
              {loadingBranches ? (
                <p className="text-sm text-text-muted italic py-4 text-center">Loading branches...</p>
              ) : branches.length === 0 ? (
                <p className="text-sm text-text-muted italic py-4 text-center">No branches found</p>
              ) : (
                <div className="space-y-1.5 mb-6">
                  {branches.map(b => (
                    <div key={b} className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      b === currentBranch 
                        ? 'bg-accent-blue/10 border-accent-blue/30' 
                        : 'bg-bg-secondary border-border hover:border-text-secondary/30'
                    }`}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <BranchIcon />
                        <span className={`font-mono text-sm truncate ${b === currentBranch ? 'text-accent-blue font-bold' : 'text-text-primary'}`}>
                          {b}
                        </span>
                        {b === currentBranch && (
                          <span className="text-[10px] font-bold bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded ml-1 uppercase">Active</span>
                        )}
                      </div>
                      
                      {b !== currentBranch && (
                        <button 
                          onClick={() => handleCheckoutBranch(b)}
                          disabled={loading}
                          className="px-3 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border rounded text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          Checkout
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Create New Branch</h4>
                {error && <p className="text-accent-red text-xs bg-accent-red/10 px-3 py-2 rounded border border-accent-red/20 mb-3">{error}</p>}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    placeholder="New branch name..."
                    className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent-blue transition-colors outline-none"
                    disabled={loading}
                  />
                  <button 
                    onClick={handleCreateBranch} 
                    disabled={loading || !branchName.trim()}
                    className="px-4 py-2 bg-btn-blue hover:bg-btn-blue-hover text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
