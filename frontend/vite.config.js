// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,  // Bind to 0.0.0.0 for Windows compatibility
    proxy: {
      '/auth': { 
        target: 'http://127.0.0.1:39999',  // Hardcode backend URL
        changeOrigin: true,
        secure: false
      },
      '/files': { 
        target: 'http://127.0.0.1:39999',
        changeOrigin: true,
        secure: false
      }
    }
  }
});