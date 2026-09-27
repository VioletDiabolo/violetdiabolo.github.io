import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // Every page, listed. A page left out of here is built by nobody: Vite builds
    // index.html alone, and the button that links to the missing page 404s in production
    // while working perfectly in dev, which is the worst shape a bug can take.
    // tests/pages.test.js checks this list against the pages the nav links to.
    rollupOptions: {
      input: { index: 'index.html', about: 'about.html', media: 'media.html', join: 'join.html' },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
