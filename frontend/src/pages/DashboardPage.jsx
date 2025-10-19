// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, LogOut, Play, Trash2, Sun, Moon } from 'lucide-react';

export default function DashboardPage({ user, onLogout, theme, toggleTheme }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activatedRepos, setActivatedRepos] = useState(new Map());

  // ✅ Automatically detect correct backend URL
  const API_BASE =
    import.meta.env.VITE_BACKEND_URL || '';

  console.log('DashboardPage init', { user, theme, API_BASE });

  // Fetch repos
  useEffect(() => {
    console.log('useEffect: starting fetchData', { API_BASE });
    const fetchData = async () => {
      try {
        const allReposUrl = `${API_BASE}/api/repos`;
        const activatedReposUrl = `${API_BASE}/api/repos/activated`;
        console.log('fetchData: fetching URLs', { allReposUrl, activatedReposUrl });

        const [allReposRes, activatedReposRes] = await Promise.all([
          fetch(allReposUrl),
          fetch(activatedReposUrl)
        ]);

        console.log('fetchData: responses received', {
          allReposStatus: allReposRes.status,
          activatedReposStatus: activatedReposRes.status
        });

        if (!allReposRes.ok || !activatedReposRes.ok) {
          const errText = `Failed to fetch repository data: statuses ${allReposRes.status}, ${activatedReposRes.status}`;
          console.error('fetchData error:', errText);
          throw new Error(errText);
        }

        const allReposData = await allReposRes.json();
        const activatedReposData = await activatedReposRes.json();

        console.log('fetchData: parsed JSON', {
          allReposCount: Array.isArray(allReposData) ? allReposData.length : typeof allReposData,
          activatedReposCount: Array.isArray(activatedReposData) ? activatedReposData.length : typeof activatedReposData
        });

        const activatedMap = new Map();
        activatedReposData.forEach(repo => {
          activatedMap.set(repo.name, repo._id);
          console.log('fetchData: mapping activated repo', { name: repo.name, id: repo._id });
        });

        setRepos(allReposData);
        setActivatedRepos(activatedMap);
        console.log('fetchData: state updated', { reposLength: allReposData.length, activatedSize: activatedMap.size });
      } catch (err) {
        console.error('fetchData caught error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log('fetchData: finished, loading set to false');
      }
    };
    fetchData();
  }, [API_BASE]);

  // Activate
  const handleActivate = async (repoId, repoFullName) => {
    console.log('handleActivate: start', { repoId, repoFullName });
    try {
      const [owner, repo] = repoFullName.split('/');
      const url = `${API_BASE}/api/repos/${owner}/${repo}/activate`;
      const payload = { githubRepoId: repoId };
      console.log('handleActivate: POST', { url, payload });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('handleActivate: response status', { status: res.status });

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (e) {
          console.error('handleActivate: failed to parse error body', e);
        }
        console.error('handleActivate: server error', { errorData });
        throw new Error((errorData && errorData.message) || 'Failed to activate');
      }

      const { repo: newActiveRepo } = await res.json();
      console.log('handleActivate: activation result', { newActiveRepo });

      setActivatedRepos(prevMap => {
        const newMap = new Map(prevMap);
        newMap.set(newActiveRepo.name, newActiveRepo._id);
        console.log('handleActivate: activatedRepos updated', { newActiveRepoName: newActiveRepo.name, newMapSize: newMap.size });
        return newMap;
      });
      alert(`✅ Successfully activated ${repoFullName}!`);
    } catch (err) {
      console.error('handleActivate caught error:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // Deactivate
  const handleDeactivate = async (repoFullName) => {
    console.log('handleDeactivate: start', { repoFullName });
    if (!window.confirm(`Are you sure you want to deactivate ${repoFullName}?`)) {
      console.log('handleDeactivate: user cancelled deactivation', { repoFullName });
      return;
    }
    try {
      const repoId = activatedRepos.get(repoFullName);
      console.log('handleDeactivate: resolved repoId', { repoFullName, repoId });

      const url = `${API_BASE}/api/repos/${repoId}/deactivate`;
      console.log('handleDeactivate: POST', { url });

      const res = await fetch(url, { method: 'POST' });

      console.log('handleDeactivate: response status', { status: res.status });

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (e) {
          console.error('handleDeactivate: failed to parse error body', e);
        }
        console.error('handleDeactivate: server error', { errorData });
        throw new Error((errorData && errorData.message) || 'Failed to deactivate');
      }

      setActivatedRepos(prevMap => {
        const newMap = new Map(prevMap);
        newMap.delete(repoFullName);
        console.log('handleDeactivate: removed from activatedRepos', { repoFullName, newMapSize: newMap.size });
        return newMap;
      });
      alert(`✅ Successfully deactivated ${repoFullName}!`);
    } catch (err) {
      console.error('handleDeactivate caught error:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const activatedRepoList = loading ? [] : repos.filter(repo => activatedRepos.has(repo.full_name));
  const availableRepoList = loading ? [] : repos.filter(repo => !activatedRepos.has(repo.full_name));
  console.log('render: computed lists', {
    loading,
    reposLength: repos.length,
    activatedRepoListLength: activatedRepoList.length,
    availableRepoListLength: availableRepoList.length
  });

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-4">
          <img src={user.avatar} alt="Avatar" className="h-12 w-12 rounded-full" />
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Signed in as</p>
            <h2 className="text-lg font-semibold">{user.username}</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="btn h-10 w-10 !p-0">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onLogout} className="btn flex items-center gap-1">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Activated Repos */}
      <main className="mt-8 space-y-12">
        <section>
          <h3 className="mb-4 text-xl font-semibold text-[var(--text-secondary)]">Activated Repositories</h3>
          <div className="flex flex-col gap-3">
            {loading ? (
              <p className="text-[var(--text-secondary)]">Loading...</p>
            ) : activatedRepoList.length > 0 ? (
              activatedRepoList.map(repo => (
                <div key={repo.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded bg-[var(--card-bg)] transition-colors">
                  <span className="font-semibold">{repo.full_name}</span>
                  <div className="flex gap-2 sm:w-auto w-full">
                    <Link to={`/repo/${activatedRepos.get(repo.full_name)}/reviews`} className="btn w-full sm:w-auto flex items-center gap-1 justify-center !text-xs">
                      <Eye size={14} /> Reviews
                    </Link>
                    <button
                      onClick={() => handleDeactivate(repo.full_name)}
                      className="btn w-full sm:w-auto flex items-center gap-1 justify-center !text-xs !border-[var(--danger-accent)] !text-[var(--danger-accent)] hover:!bg-[var(--danger-accent)] hover:!text-white"
                    >
                      <Trash2 size={14} /> Deactivate
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[var(--text-secondary)] p-6 border rounded bg-[var(--card-bg)]">
                No repositories activated yet.
              </div>
            )}
          </div>
        </section>

        {/* Available Repos */}
        <section>
          <h3 className="mb-4 text-xl font-semibold text-[var(--text-secondary)]">Available Repositories</h3>
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 w-full rounded-lg bg-[var(--surface-inset)] animate-pulse"></div>
                ))}
              </div>
            ) : availableRepoList.length > 0 ? (
              availableRepoList.map(repo => (
                <div key={repo.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded bg-[var(--card-bg)] transition-colors">
                  <span className="font-semibold">{repo.full_name}</span>
                  <button
                    onClick={() => handleActivate(repo.id, repo.full_name)}
                    className="btn w-full sm:w-auto flex items-center gap-1 justify-center !text-xs"
                  >
                    <Play size={14} /> Activate
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-[var(--text-secondary)] p-6 border rounded bg-[var(--card-bg)]">
                All available repositories are activated.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
