import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/dashboard': 'http://localhost:3002',
      '/health': 'http://localhost:3002',
      '/isRunning': 'http://localhost:3002',
      '/reports': 'http://localhost:3002',
      '/analysis': 'http://localhost:3002',
      '/start': 'http://localhost:3002',
      '/stop': 'http://localhost:3002',
      '/analyze': 'http://localhost:3002',
    },
  },
});
