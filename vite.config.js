import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // Two HTML entries. Without listing media.html here Vite builds index.html alone and
    // the Media pill 404s in production while working perfectly in dev, which is the
    // worst shape a bug can take.
    rollupOptions: { input: { index: 'index.html', media: 'media.html' } },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
