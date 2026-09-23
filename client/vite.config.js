import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build lands in client/dist, which Express serves as static
// files. During `npm run dev` the proxy forwards API and auth calls to the
// Express server on port 3000 so cookies still behave as same-origin.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
});
