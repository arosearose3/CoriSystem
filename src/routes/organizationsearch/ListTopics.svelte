<script>
    import { onMount } from 'svelte';
    import { user } from '$lib/stores.js';
    import { base } from '$app/paths'; // Import base path

 
  
    let topics = [];
    let error = null;
  
    // Fetch topics from the Express API
    async function fetchTopics() {
      try {
        const response = await fetch(`${base}/api/api211/getTopics`);
        if (!response.ok) {
          throw new Error('Failed to fetch topics');
        }
        topics = await response.json();
      } catch (err) {
        error = err.message;
      }
    }
  
    // Fetch topics when the component mounts
    onMount(() => {
      fetchTopics();
    });
  </script>
  
  <style>
    .error {
      color: red;
      font-weight: bold;
    }
  
    .topic-list {
      list-style-type: none;
      padding: 0;
    }
  
    .topic-item {
      background-color: #f9f9f9;
      margin-bottom: 8px;
      padding: 10px;
      border-radius: 4px;
    }
  </style>
  
  {#if error}
    <div class="error">Error: {error}</div>
  {:else if topics.length === 0}
    <p>Loading topics...</p>
  {:else}
    <ul class="topic-list">
      {#each topics as topic}
        <li class="topic-item">{topic}</li>
      {/each}
    </ul>
  {/if}
  