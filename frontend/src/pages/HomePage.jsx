import React, { useEffect } from 'react';
import { Github } from 'lucide-react';

export default function HomePage() {
  console.log('HomePage: function start');

  useEffect(() => {
    console.log('HomePage: mounted');
    return () => {
      console.log('HomePage: unmounted');
    };
  }, []);

  console.log('HomePage: before return');

  const handleLoginClick = (e) => {
    console.log('HomePage: login button clicked', {
      href: 'https://codeguardian-backend-1ftn.onrender.com/api/auth/github',
      time: new Date().toISOString()
    });
    // allow navigation to proceed
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-4 text-center">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[var(--background)] bg-[radial-gradient(var(--border)_1px,_transparent_1px)] [background-size:16px_16px]"></div>

      {console.log('HomePage: rendering heading and description')}
      <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
        CodeGuardian <span className="text-[var(--primary-accent)]">AI</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-[var(--text-secondary)]">
        Your automated code review assistant. Activate on your repositories to get instant, AI-powered feedback on every pull request.
      </p>
      <a href="https://codeguardian-backend-1ftn.onrender.com/api/auth/github" className="mt-8">
        <button className="btn btn-primary" onClick={handleLoginClick}>
          {console.log('HomePage: rendering Github icon')}
          <Github size={18} />
          Login with GitHub
        </button>
      </a>
    </div>
  );
}

