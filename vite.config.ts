import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { game: 'index.html', admin: 'admin.html' },
      output: { manualChunks: { three: ['three'] } },
    },
  },
});
