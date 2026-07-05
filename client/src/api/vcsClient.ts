import type {
  StatusResponse,
  InitResponse,
  AddResponse,
  CommitResponse,
  CommitEntry,
  FileChange,
  DiffLine,
  ConfigResponse,
  RevertResponse,
  ObjectResponse,
} from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = body.message || res.statusText;

    if (res.status === 502 || message.toLowerCase().includes('bad gateway')) {
      throw new Error('Backend server is not running. Start mini-git-api.exe on port 8080, then try again.');
    }

    throw new Error(message || `API error: ${res.status}`);
  }

  return res.json();
}


export const vcsClient = {
  status: () => request<StatusResponse>('/status'),
  setWorkspace: (path: string) => request<{ success: boolean; message?: string }>('/workspace', {
    method: 'POST',
    body: JSON.stringify({ path }),
  }),
  init: () => request<InitResponse>('/init', { method: 'POST' }),
  add: (files: string[]) =>
    request<AddResponse>('/add', {
      method: 'POST',
      body: JSON.stringify({ files }),
    }),
  commit: (message: string) =>
    request<CommitResponse>('/commit', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  log: () => request<CommitEntry[]>('/log'),
  changes: () => request<FileChange[]>('/changes'),
  diff: (oldHash: string, filename: string) =>
    request<DiffLine[]>('/diff', {
      method: 'POST',
      body: JSON.stringify({ oldHash, filename }),
    }),
  branch: (name: string) =>
    request<{ success: boolean }>('/branch', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  checkout: (name: string) =>
    request<{ success: boolean }>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  config: () => request<ConfigResponse>('/config'),
  setConfig: (key: string, value: string) =>
    request<{ success: boolean }>('/config', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    }),
  setRemote: (remote_owner: string, remote_repo: string, remote_url: string) =>
    request<{ success: boolean }>('/config', {
      method: 'POST',
      body: JSON.stringify({ remote_owner, remote_repo, remote_url }),
    }),
  object: (hash: string) => request<ObjectResponse>(`/object/${hash}`),
  revert: (commitHash: string) =>
    request<RevertResponse>('/revert', {
      method: 'POST',
      body: JSON.stringify({ commitHash }),
    }),
};

