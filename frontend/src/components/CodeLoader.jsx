// frontend/src/components/CodeLoader.jsx
import React from 'react';

export default function CodeLoader() {
  const lines = [
    'Fetching repositories...',
    'Analyzing pull requests...',
    'Running AI code review...',
    'Generating feedback...',
  ];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--background)] font-mono">
      <div className="bg-[var(--surface)] p-6 rounded-lg shadow-md w-[90%] max-w-xl animate-fade-in">
        {lines.map((line, index) => (
          <p
            key={index}
            className={`text-[var(--text-secondary)] text-sm mb-2 overflow-hidden relative before:absolute before:left-0 before:top-0 before:h-full before:w-full before:bg-[var(--text-primary)] before:animate-typewriter`}
            style={{ animationDelay: `${index * 0.5}s` }}
          >
            {line}
          </p>
        ))}
        <div className="mt-4 h-2 bg-[var(--primary-accent)] rounded-full animate-pulse" />
      </div>
    </div>
  );
}
