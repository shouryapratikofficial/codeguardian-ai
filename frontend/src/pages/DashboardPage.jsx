// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, LogOut, Play, Trash2, Sun, Moon } from 'lucide-react';

export default function DashboardPage({ user, onLogout , theme, toggleTheme}) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activatedRepos, setActivatedRepos] = useState(new Map());




  // Fetch repos
  useEffect(() => {
    console.log('Fetching repository data...');
    const fetchData = async () => {
      try {
        
        const [allReposRes, activatedReposRes] = await Promise.all([
          fetch('/api/repos'),
          fetch('/api/repos/activated')
        ]);
        if (!allReposRes.ok || !activatedReposRes.ok) throw new Error('Failed to fetch repository data');
        const allReposData = await allReposRes.json();
        const activatedReposData = await activatedReposRes.json();
        const activatedMap = new Map();
        activatedReposData.forEach(repo => activatedMap.set(repo.name, repo._id));
        setRepos(allReposData);
        setActivatedRepos(activatedMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  // Activate
  const handleActivate = async (repoId, repoFullName) => {
    try {
      const [owner, repo] = repoFullName.split('/');
      const res = await fetch(`/api/repos/${owner}/${repo}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubRepoId: repoId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to activate');
      }
      const { repo: newActiveRepo } = await res.json();
      setActivatedRepos(prevMap => new Map(prevMap).set(newActiveRepo.name, newActiveRepo._id));
      alert(`Successfully activated ${repoFullName}!`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Deactivate
  const handleDeactivate = async (repoFullName) => {
    if (!window.confirm(`Are you sure you want to deactivate ${repoFullName}?`)) return;
    try {
      const repoId = activatedRepos.get(repoFullName);
      const res = await fetch(`/api/repos/${repoId}/deactivate`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to deactivate');
      }
      setActivatedRepos(prevMap => {
        const newMap = new Map(prevMap);
        newMap.delete(repoFullName);
        return newMap;
      });
      alert(`Successfully deactivated ${repoFullName}!`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const activatedRepoList = loading ? [] : repos.filter(repo => activatedRepos.has(repo.full_name));
  const availableRepoList = loading ? [] : repos.filter(repo => !activatedRepos.has(repo.full_name));

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
              <div className="text-center text-[var(--text-secondary)] p-6 border rounded bg-[var(--card-bg)]">No repositories activated yet.</div>
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
      <div
        key={i}
        className="h-16 w-full rounded-lg bg-[var(--surface-inset)] animate-pulse"
      ></div>
    ))}
  </div>
)  : availableRepoList.length > 0 ? (
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
              <div className="text-center text-[var(--text-secondary)] p-6 border rounded bg-[var(--card-bg)]">All available repositories are activated.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
