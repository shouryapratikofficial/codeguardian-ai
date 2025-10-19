// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReviewHistoryPage from './pages/ReviewHistoryPage';

const API_BASE_URL = 'https://codeguardian-backend-1ftn.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const navigate = useNavigate();

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          credentials: 'include',
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Auto-redirect logged-in user to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [loading, user]);

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={!user ? <HomePage /> : <DashboardPage user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}
      />
      <Route
        path="/dashboard"
        element={user ? <DashboardPage user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} /> : <HomePage />}
      />
      <Route
        path="/repo/:repoId/reviews"
        element={user ? <ReviewHistoryPage theme={theme} toggleTheme={toggleTheme} /> : <HomePage />}
      />
    </Routes>
  );
}

export default App;
