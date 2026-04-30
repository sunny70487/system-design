import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
