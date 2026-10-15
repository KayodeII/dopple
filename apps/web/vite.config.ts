/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

/**
 * The web app and the API share the school's address (ADR 0008): the browser
 * calls /api/... on the same host and port, and this proxy forwards it with the
 * Host header untouched, so the API still knows which school is asking. In
 * production the edge does the same job.
 */
const proxy: Record<string, ProxyOptions> = {
  '/api': {
    target: process.env.DOPPLE_API_URL ?? 'http://localhost:3000',
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};

// Every school is a subdomain: greenfield.dopple.localhost, riverside.dopple.localhost, ...
const allowedHosts = ['.dopple.localhost'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3200, strictPort: true, allowedHosts, proxy },
  preview: { port: 3200, strictPort: true, allowedHosts, proxy },
  test: { include: ['src/**/*.test.ts'] },
});
