
<script>
  import { onMount } from 'svelte';

  let serverStats = null;
  let loading = false;
  let error = null;

  // Function to fetch the server stats
  async function fetchServerStats() {
    loading = true;
    error = null;
    try {
      const response = await fetch('/serverstats');
      if (!response.ok) {
        throw new Error('Failed to fetch server stats');
      }
      serverStats = await response.json();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // Fetch stats on component mount
  onMount(() => {
    fetchServerStats();
  });

  // Refresh button handler
  function refreshStats() {
    fetchServerStats();
  }
</script>

<main>
  <h1>Server Statistics</h1>

  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p>Error: {error}</p>
  {:else if serverStats}
    <div>
      <p><strong>Process Uptime:</strong> {serverStats.processUptime} seconds</p>
      <p><strong>System Uptime:</strong> {serverStats.systemUptime} hours</p>
      <p><strong>Total Memory:</strong> {serverStats.totalMemory} MB</p>
      <p><strong>Free Memory:</strong> {serverStats.freeMemory} MB</p>
      <p><strong>Used Memory:</strong> {serverStats.usedMemory} MB</p>
      <p><strong>CPU Usage:</strong> {serverStats.cpuUsage}%</p>
    </div>

    <button on:click={refreshStats}>Refresh</button>
  {:else}
    <p>No data available.</p>
  {/if}
</main>

<style>
  main {
    padding: 20px;
    font-family: Arial, sans-serif;
  }

  button {
    padding: 10px 20px;
    margin-top: 20px;
    cursor: pointer;
  }
</style>
