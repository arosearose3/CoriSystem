// svelte.config.js
import adapter from '@sveltejs/adapter-node';
import * as dotenv from 'dotenv';

// Load the correct .env file based on environment
// const runtimeEnv = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env';
dotenv.config({ path: '.env' });

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    paths: {
      base: process.env.BASE_PATH
    },

    prerender: {
      handleHttpError: 'warn'
    }
  },
  vite: {
    server: {
      port: 5174 // Set the development server port to 5174
    }
  },
  //preprocess: vitePreprocess(),
};

export default config;

