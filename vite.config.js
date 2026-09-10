import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/**/*.dom.test.js', 'jsdom']],
    include: ['tests/**/*.test.js'],
  },
});
