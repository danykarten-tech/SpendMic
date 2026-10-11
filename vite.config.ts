/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['@xenova/transformers', '/lib/transformers.min.js'],
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: ['@xenova/transformers', '/lib/transformers.min.js'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
  },
})
