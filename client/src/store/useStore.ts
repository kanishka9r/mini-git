import { create } from 'zustand';
import { vcsClient } from '../api/vcsClient';
import type { SyncLog } from '../types';



function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { void 0; }
}



interface AppState {
  token: string;
  username: string;
  isLoggedIn: boolean;
  workspacePath: string;
  isInitialized: boolean;
  currentBranch: string;
  headCommit: string;
  remoteOwner: string;
  remoteRepo: string;
  remoteUrl: string;
  isSyncing: boolean;
  syncProgress: number;
  syncLogs: SyncLog[];

  setAuth: (token: string, username: string) => void;
  clearAuth: () => void;
  refreshStatus: () => Promise<void>;
  loadConfig: () => Promise<void>;
  addSyncLog: (message: string, type: SyncLog['type']) => void;
  clearSyncLogs: () => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: number) => void;
  setRemote: (owner: string, repo: string, url: string) => void;
  setWorkspacePath: (path: string) => Promise<void>;
  initWorkspace: () => Promise<void>;
}


export const useStore = create<AppState>((set, get) => ({

  token: loadFromStorage('mg_token', ''),
  username: loadFromStorage('mg_username', ''),
  isLoggedIn: !!loadFromStorage<string>('mg_token', ''),

  workspacePath: loadFromStorage('mg_workspace_path', ''),

  isInitialized: false,
  currentBranch: '',
  headCommit: '',
  remoteOwner: loadFromStorage('mg_remote_owner', ''),
  remoteRepo: loadFromStorage('mg_remote_repo', ''),
  remoteUrl: loadFromStorage('mg_remote_url', ''),
  isSyncing: false,
  syncProgress: 0,
  syncLogs: [],


  setAuth: (token, username) => {
    saveToStorage('mg_token', token);
    saveToStorage('mg_username', username);
    set({ token, username, isLoggedIn: true });
  },

  clearAuth: () => {
    localStorage.removeItem('mg_token');
    localStorage.removeItem('mg_username');
    set({ token: '', username: '', isLoggedIn: false });
  },

  refreshStatus: async () => {
    try {
      const status = await vcsClient.status();
      set({
        isInitialized: status.initialized,
        currentBranch: status.branch,
        headCommit: status.headCommit,
      });
    } catch {
      set({ isInitialized: false, currentBranch: '', headCommit: '' });
    }
  },

  loadConfig: async () => {
    try {
      const config = await vcsClient.config();
      const current = get();


      const newToken = config.token || current.token;
      const newUsername = config.username || current.username;


      if (config.remote_owner) saveToStorage('mg_remote_owner', config.remote_owner);
      if (config.remote_repo) saveToStorage('mg_remote_repo', config.remote_repo);
      if (config.remote_url) saveToStorage('mg_remote_url', config.remote_url);

      set({
        token: newToken,
        username: newUsername,
        isLoggedIn: !!newToken,
        remoteOwner: config.remote_owner || current.remoteOwner,
        remoteRepo: config.remote_repo || current.remoteRepo,
        remoteUrl: config.remote_url || current.remoteUrl,
      });
    } catch {
      void 0;
    }
  },

  addSyncLog: (message, type) =>
    set((state) => ({
      syncLogs: [
        ...state.syncLogs,
        { timestamp: new Date().toLocaleTimeString(), message, type },
      ],
    })),

  clearSyncLogs: () => set({ syncLogs: [] }),

  setSyncing: (syncing) => set({ isSyncing: syncing }),

  setSyncProgress: (progress) => set({ syncProgress: progress }),

  setRemote: (owner, repo, url) => {
    saveToStorage('mg_remote_owner', owner);
    saveToStorage('mg_remote_repo', repo);
    saveToStorage('mg_remote_url', url);
    set({ remoteOwner: owner, remoteRepo: repo, remoteUrl: url });
  },

  setWorkspacePath: async (path: string) => {
    try {
      const res = await vcsClient.setWorkspace(path);
      if (res.success) {
        saveToStorage('mg_workspace_path', path);
        set({ workspacePath: path });
        get().refreshStatus();
        get().loadConfig();
      } else {
        throw new Error(res.message);
      }
    } catch (e) {
      const err = e as Error;
      throw new Error(err.message || 'Failed to set workspace', { cause: e });
    }
  },

  initWorkspace: async () => {
    const path = get().workspacePath;
    if (path) {
      try {
        await vcsClient.setWorkspace(path);
      } catch {
        void 0;
      }
    }
  },
}));
