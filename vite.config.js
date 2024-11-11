import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	envPrefix: ['VITE_'] ,  
	optimizeDeps: {
		include: ['lodash', 'lucide-svelte'],
	  },
	  build: {
		sourcemap: true,
		rollupOptions: {
		  cache: true,
		},
		commonjsOptions: {
		  include: [/node_modules/],
		},
	  },
	  server: {
		fs: {
		  strict: false
		},
		watch: {
		  ignored: ['**/node_modules/**']
		}
	  }
	});

