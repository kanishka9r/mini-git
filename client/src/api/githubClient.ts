import type { GitHubUser, GitHubRepo, GitHubRef, GitHubBlob, GitHubTree, GitHubCommit } from '../types';

const GH_API = 'https://api.github.com';
function ghHeaders(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function ghRequest<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: ghHeaders(token),
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401) throw new Error('Invalid token. Please check and try again.');
    if (res.status === 403) throw new Error('Access forbidden. Check token permissions.');
    if (res.status === 422) throw new Error('Validation failed: ' + body.message);
    throw new Error(body.message || `GitHub API error: ${res.status}`);
  }

  return res.json();
}


export const githubClient = {
  validateToken: (token: string) =>
    ghRequest<GitHubUser>(`${GH_API}/user`, token),
  createRepo: (token: string, name: string, isPrivate: boolean) =>
    ghRequest<GitHubRepo>(`${GH_API}/user/repos`, token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true,
        description: 'Created with mini-git',
      }),
    }),
  getRef: (token: string, owner: string, repo: string, branch: string) =>
    ghRequest<GitHubRef>(`${GH_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token)
      .catch((err) => {
        if (err.message.includes('Not Found') || err.message.includes('empty') || err.message.includes('409')) return null;
        throw err;
      }),
  createBlob: (token: string, owner: string, repo: string, content: string) =>
    ghRequest<GitHubBlob>(`${GH_API}/repos/${owner}/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'utf-8' }),
    }),
  createTree: (
    token: string, owner: string, repo: string,
    tree: Array<{ path: string; mode: string; type: string; sha: string }>,
    baseTree?: string,
  ) =>
    ghRequest<GitHubTree>(`${GH_API}/repos/${owner}/${repo}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ tree, ...(baseTree ? { base_tree: baseTree } : {}) }),
    }),
  createCommit: (
    token: string, owner: string, repo: string,
    message: string, treeSha: string, parentSha?: string,
  ) =>
    ghRequest<GitHubCommit>(`${GH_API}/repos/${owner}/${repo}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: treeSha,
        ...(parentSha ? { parents: [parentSha] } : {}),
      }),
    }),
  updateRef: (token: string, owner: string, repo: string, branch: string, sha: string) =>
    ghRequest<GitHubRef>(`${GH_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ sha, force: true }),
    }),
  createRef: (token: string, owner: string, repo: string, branch: string, sha: string) =>
    ghRequest<GitHubRef>(`${GH_API}/repos/${owner}/${repo}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    }),
  getTree: (token: string, owner: string, repo: string, sha: string) =>
    ghRequest<GitHubTree>(`${GH_API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, token),
  getBlob: async (token: string, owner: string, repo: string, sha: string): Promise<string> => {
    const data = await ghRequest<{ content: string; encoding: string }>(
      `${GH_API}/repos/${owner}/${repo}/git/blobs/${sha}`, token
    );
    return atob(data.content);
  },
};
