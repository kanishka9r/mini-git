import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { githubClient } from '../api/githubClient';
import { vcsClient } from '../api/vcsClient';
import { useStore } from '../store/useStore';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { setAuth, clearAuth, isLoggedIn, username } = useStore();
  const navigate = useNavigate();

  async function handleConnect() {
    const trimmed = token.trim();
    if (!trimmed) { setError('Please enter a token.'); return; }
    if (!trimmed.startsWith('ghp_') && !trimmed.startsWith('github_pat_')) {
      setError("Token should start with 'ghp_' or 'github_pat_'.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = await githubClient.validateToken(trimmed);
      setAuth(trimmed, user.login);

      try {
        await vcsClient.setConfig('token', trimmed);
        await vcsClient.setConfig('username', user.login);
      } catch { void 0; }

      setSuccess(`Connected as ${user.login}`);
      setToken('');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    clearAuth();
    vcsClient.setConfig('token', '').catch(() => {});
    vcsClient.setConfig('username', '').catch(() => {});
    setSuccess('');
    setError('');
  }

  return (
    <div className="flex items-center justify-center min-h-full py-12 px-6">
      <div className="w-full max-w-[460px] animate-fade-in space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-lg bg-btn-blue flex items-center justify-center text-2xl text-white font-extrabold shadow-[var(--shadow-soft)]">
            GH
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Connect to GitHub</h1>
            <p className="text-text-secondary text-sm mt-2">Link your account using a Personal Access Token.</p>
          </div>
        </div>

        <div className="card">
          {isLoggedIn ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-bg-primary rounded-lg border border-border">
                <div className="w-12 h-12 rounded-lg bg-btn-blue flex items-center justify-center text-base font-bold text-white shadow-sm">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-accent-green font-semibold text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
                    Connected
                  </p>
                  <p className="text-text-secondary text-sm mt-1 truncate">
                    Logged in as <span className="text-accent-blue font-mono font-medium">{username}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-3 bg-btn-blue hover:bg-btn-blue-hover text-white font-semibold rounded-lg text-sm transition-all duration-200 cursor-pointer shadow-sm"
                >
                  Open Dashboard
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-3 bg-transparent border border-btn-red/25 text-accent-red rounded-lg text-sm font-semibold hover:bg-btn-red/5 transition-all duration-200 cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-primary">
                  Personal Access Token
                </label>
                <p className="text-xs text-text-muted leading-relaxed">
                  GitHub / Settings / Developer settings / Personal access tokens / Generate new token
                </p>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-text-primary text-sm font-mono placeholder-text-muted/50 focus:border-border-active transition-colors duration-200"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-accent-red/5 border border-accent-red/15 rounded-lg animate-fade-in-fast">
                  <span className="text-accent-red text-sm font-bold">!</span>
                  <p className="text-accent-red text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 p-3 bg-accent-green/5 border border-accent-green/15 rounded-lg animate-fade-in-fast">
                  <span className="text-accent-green text-sm font-bold">OK</span>
                  <p className="text-accent-green text-sm">{success}</p>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full py-3 bg-btn-blue hover:bg-btn-blue-hover disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting
                  </span>
                ) : (
                  'Connect to GitHub'
                )}
              </button>
            </div>
          )}
        </div>

        <div className="card !p-4">
          <h3 className="font-semibold text-xs text-text-muted uppercase tracking-widest mb-3">Required Permissions</h3>
          <div className="space-y-2">
            {[
              { scope: 'repo', desc: 'Full control of repositories' },
              { scope: 'read:user', desc: 'Read user profile data' },
            ].map((p) => (
              <div key={p.scope} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />
                <span className="text-text-primary font-mono text-xs font-semibold">{p.scope}</span>
                <span className="text-text-secondary text-xs">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
