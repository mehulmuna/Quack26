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
      '/dashboard': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/reports': 'http://localhost:3000',
      '/analysis': 'http://localhost:3000',
      '/start': 'http://localhost:3000',
      '/stop': 'http://localhost:3000',
      '/analyze': 'http://localhost:3000',
    },
  },
});
