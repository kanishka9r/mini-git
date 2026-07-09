export interface StatusResponse {
  initialized: boolean;
  branch: string;
  headCommit: string;
}

export interface InitResponse {
  success: boolean;
  message: string;
}

export interface AddResponse {
  success: boolean;
  staged: number;
}

export interface CommitResponse {
  success: boolean;
  hash?: string;
  message?: string;
}

export interface CommitEntry {
  hash: string;
  parentHash: string;
  message: string;
  timestamp: number;
  files: Record<string, string>;
  fileCount: number;
}

export interface FileChange {
  filename: string;
  status: 'modified' | 'added' | 'deleted';
  oldHash: string;
  newHash: string;
}

export interface DiffLine {
  type: '+' | '-' | ' ';
  text: string;
}

export interface StagingStatusResponse {
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  tracked: string[];
}

export interface ConfigResponse {
  token: string;
  username: string;
  remote_owner: string;
  remote_repo: string;
  remote_url: string;
}

export interface RevertResponse {
  success: boolean;
  newHash?: string;
  message: string;
}

export interface ObjectResponse {
  content: string;
}


export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface GitHubRepo {
  html_url: string;
  name: string;
  owner: { login: string };
  private: boolean;
}

export interface GitHubRef {
  ref: string;
  object: { sha: string; type: string };
}

export interface GitHubBlob {
  sha: string;
}

export interface GitHubTree {
  sha: string;
  tree: Array<{ path: string; sha: string; type: string; mode: string }>;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  tree: { sha: string };
  parents: Array<{ sha: string }>;
}


export interface SyncLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'progress';
}
