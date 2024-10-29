<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    
    let serverStats = null;
    let error = null;
  
    // Function to fetch server stats
    async function fetchServerStats() {
      try {
        const response = await fetch(`${base}/api/serverstats/serverstats`);
        if (!response.ok) {
          throw new Error('Failed to fetch server stats');
        }
        serverStats = await response.json();
        error = null; // Reset error if the request is successful
      } catch (err) {
        console.error('Error fetching server stats:', err);
        error = 'Failed to load server stats.';
      }
    }
  
    // Fetch server stats when the component mounts
    onMount(() => {
      fetchServerStats();
    });
  </script>
  
  <div class="server-stats-container">
    {#if error}
      <p class="error-message">{error}</p>
    {:else if !serverStats}
      <p>Loading server stats...</p>
    {:else}
      <div class="stats">
        <h3>Server Stats</h3>
        <ul>
          {#each Object.keys(serverStats) as key}
            <li>
              <strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {typeof serverStats[key] === 'number' ? serverStats[key].toFixed(2) : serverStats[key]}
            </li>
          {/each}
        </ul>
      </div>
      <button on:click={fetchServerStats}>Refresh</button>
    {/if}
  </div>
  
  <style>
    .server-stats-container {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 8px;
      max-width: 400px;
      margin: 0 auto;
      text-align: center;
    }
  
    .stats {
      margin-bottom: 20px;
    }
  
    ul {
      list-style-type: none;
      padding: 0;
    }
  
    ul li {
      margin: 10px 0;
    }
  
    button {
      padding: 10px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #0056b3;
    }
  
    .error-message {
      color: red;
    }
  </style>
  