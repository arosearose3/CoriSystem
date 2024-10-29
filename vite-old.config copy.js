// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@casl/ability'], // Include CASL for dependency optimization
  },
  build: {
    rollupOptions: {
      // Modify external configuration to avoid excluding SvelteKit's internal modules
      external:[], 
    },
  },
});
