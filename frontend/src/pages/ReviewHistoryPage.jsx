import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitPullRequest, Github, Sun, Moon } from 'lucide-react';
  const API_BASE =
    import.meta.env.VITE_BACKEND_URL || '';
export default function ReviewHistoryPage({ theme, toggleTheme }) {
    
  const { repoId } = useParams();
  const [data, setData] = useState({ repo: null, reviews: [] });
  const [loading, setLoading] = useState(true);

  // useEffect for fetching review data remains the same.
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reviews/${repoId}`);
        if (!res.ok) throw new Error('Failed to fetch review history.');
        setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [repoId]);

 if (loading)  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
      <svg
        className="animate-spin h-8 w-8 text-[var(--primary-accent)]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span className="ml-2 text-lg text-[var(--text-secondary)]">Loading...</span>
    </div>
  );


  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <Link to="/dashboard" className="btn">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <button onClick={toggleTheme} className="btn h-10 w-10 !p-0">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <h1 className="mb-2 text-3xl font-bold">Review History</h1>
      <p className="mb-6 text-[var(--text-secondary)]">
        Showing reviews for <span className="font-semibold text-[var(--primary-accent)]">{data.repo?.name}</span>
      </p>

      {data.reviews.length === 0 ? (
        <div className="card text-center p-8">
          <p className="text-[var(--text-secondary)]">No reviews found yet. Open a pull request to see the AI analysis here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.reviews.map(review => (
            <div key={review._id} className="card !p-0">
              <div className="flex flex-col items-start gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <GitPullRequest size={18} className="text-green-500" />
                  #{review.pullRequestNumber}: {review.pullRequestTitle}
                </h3>
                <a href={review.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="btn w-full !text-xs sm:w-auto">
                  <Github size={14} /> View on GitHub
                </a>
              </div>
              <pre className="whitespace-pre-wrap bg-[var(--surface-inset)] p-4 font-mono text-sm text-[var(--text-secondary)]">
                {review.reviewContent}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

