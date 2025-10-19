// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReviewHistoryPage from './pages/ReviewHistoryPage';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
const [theme, setTheme] = useState('light');

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
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, { credentials: 'include' });
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

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
    setUser(null);
    navigate('/');
  };



  return (
    <Routes>
      <Route path="/" element={!user ? <HomePage /> :   <DashboardPage user={user} onLogout={handleLogout} />} />
      <Route path="/dashboard" element={user ? <DashboardPage theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} /> : <HomePage />} />
      <Route path="/repo/:repoId/reviews" element={user ? <ReviewHistoryPage theme={theme} toggleTheme={toggleTheme} /> : <HomePage />} />
    </Routes>
  );
}

export default App;