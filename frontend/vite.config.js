// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxying API requests to the backend
      '/api': {
        target: 'http://localhost:5000', // Your backend server URL
        changeOrigin: true,
      },
    },
  },
});