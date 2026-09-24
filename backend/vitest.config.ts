import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
