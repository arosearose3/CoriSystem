<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; // Import base path
    
    let keyword = '';
    let topic = '';
    let subtopic = '';
    let location = '';
    let results = [];
    let error = null;
    let loading = false;
  
    // Function to perform the search
    async function performSearch() {
      error = null;
      results = [];
      loading = true;
  
      try {
        // Perform the search using Keyword, Topic, Subtopic, and Location
        const response = await fetch(`${base}/api/api211/search211?Keyword=${encodeURIComponent(keyword)}&Topic=${encodeURIComponent(topic)}&Subtopic=${encodeURIComponent(subtopic)}&Location=${encodeURIComponent(location)}`);
  
        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }
  
        const data = await response.json();
        results = data.results; // Assuming the response has a 'results' array
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
  </script>
  
  <style>
    .container {
      margin: 20px;
    }
  
    .form-group {
      margin-bottom: 10px;
    }
  
    input {
      padding: 8px;
      font-size: 14px;
      width: 100%;
      margin-top: 4px;
    }
  
    button {
      padding: 10px 15px;
      background-color: #007BFF;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 4px;
    }
  
    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  
    .results {
      margin-top: 20px;
    }
  
    .result-item {
      margin-bottom: 10px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #f9f9f9;
    }
  
    .error {
      color: red;
      margin-top: 10px;
    }
  </style>
  
  <div class="container">
    <!-- Search Form -->
    <div class="form-group">
      <label for="keyword">Keyword</label>
      <input id="keyword" bind:value={keyword} type="text" placeholder="Enter keyword (e.g. food)" />
    </div>
  
    <div class="form-group">
      <label for="topic">Topic</label>
      <input id="topic" bind:value={topic} type="text" placeholder="Enter topic (e.g. Housing)" />
    </div>
  
    <div class="form-group">
      <label for="subtopic">Subtopic</label>
      <input id="subtopic" bind:value={subtopic} type="text" placeholder="Enter subtopic (e.g. Emergency Shelter)" />
    </div>
  
    <div class="form-group">
      <label for="location">Location</label>
      <input id="location" bind:value={location} type="text" placeholder="Enter location (e.g. Denver)" />
    </div>
  
    <button on:click={performSearch} disabled={loading}>Search</button>
  
    <!-- Display loading indicator -->
    {#if loading}
      <p>Loading...</p>
    {/if}
  
    <!-- Display error message -->
    {#if error}
      <div class="error">{error}</div>
    {/if}
  
    <!-- Display search results -->
    <div class="results">
      {#if results.length > 0}
        <h3>Search Results:</h3>
        {#each results as result (result.document.id)}
          <div class="result-item">
            <strong>{result.document.nameService}</strong>
            <p>{result.document.descriptionService}</p>
            <p><strong>Location:</strong> {result.document.cityPhysicalAddress}, {result.document.statePhysicalAddress}</p>
          </div>
        {/each}
      {/if}
    </div>
  </div>
  