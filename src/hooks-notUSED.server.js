// src/hooks.server.js

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Log incoming SvelteKit route requests
    console.log('--- SvelteKit Route Request ---');
    console.log('---  ---');
    console.log(`URL: ${event.url.pathname}`);
    console.log(`Method: ${event.request.method}`);
    console.log('***  ---');
  
    // Proceed to resolve the request
    const response = await resolve(event);
    return response;
  }
  