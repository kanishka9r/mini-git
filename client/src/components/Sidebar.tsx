import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

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

const navItems: NavItem[] = [
  { to: '/login', icon: <KeyIcon />, label: 'Login' },
  { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
  { to: '/save', icon: <SaveIcon />, label: 'Save' },
  { to: '/sync', icon: <SyncIcon />, label: 'Sync' },
  { to: '/history', icon: <HistoryIcon />, label: 'History' },
];

export default function Sidebar() {
  const { isLoggedIn, username, isInitialized, currentBranch } = useStore();

  return (
    <aside className="w-[240px] min-w-[240px] bg-bg-secondary/95 border-r border-border flex flex-col shadow-sm transition-colors duration-300">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-btn-blue flex items-center justify-center text-white text-base font-bold shadow-[var(--shadow-soft)] flex-shrink-0">
            G
          </div>
          <div className="min-w-0">
            <h1 className="text-text-primary text-lg font-extrabold tracking-tight leading-tight">Mini-Git</h1>
            <p className="text-text-muted text-xs font-semibold uppercase leading-tight mt-0.5">
              Version Control
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 h-px bg-border" />

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
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

      <div className="mx-5 h-px bg-border" />

      <div className="px-4 py-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary/55 p-3">
            <div className="w-9 h-9 rounded-lg bg-btn-blue flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary font-semibold truncate">{username}</p>
              <p className="text-xs text-accent-green flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
                Connected
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary/55 p-3">
            <div className="w-9 h-9 rounded-lg bg-bg-secondary flex items-center justify-center text-sm text-text-muted flex-shrink-0 border border-border">
              ?
            </div>
            <span className="text-sm text-text-muted font-medium">Not connected</span>
          </div>
        )}

        {isInitialized && currentBranch && (
          <div className="mt-3 px-3 py-2 bg-bg-secondary rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-xs text-text-secondary font-mono truncate">{currentBranch}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-4 text-xs text-text-muted font-medium">v1.0.0</div>
    </aside>
  );
}
