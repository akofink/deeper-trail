import { defineConfig } from 'vitest/config';

const githubPagesBase = process.env.VITE_BASE_PATH ?? '/';

if (!process.env.TMPDIR && process.platform !== 'win32') {
  process.env.TMPDIR = '/tmp';
}

export default defineConfig({
  base: githubPagesBase,
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
