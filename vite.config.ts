import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * The storefront runs on 5174 so it can sit next to the ops console on 5173
 * without either one stealing the other's port.
 *
 * /api is proxied to storefront-api rather than called cross-origin: the
 * browser then makes same-origin requests, so there is no CORS preflight on
 * every call and development behaves the way production will when both sit
 * behind one reverse proxy.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely; keeping them out of the app chunk means a
        // release does not make every returning visitor download React again.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: process.env.STORE_API ?? 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
});
