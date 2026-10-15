import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the website runs on port 5173 and passes API calls
// (and uploaded receipts) through to the Express server on port 4000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
