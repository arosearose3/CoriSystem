<script>
    import { onMount } from 'svelte';
    let locationData = {};
    let error = null;
  
    // Function to fetch user's location info from ipinfo.io
    async function fetchLocationData() {
      try {
        const response = await fetch('https://ipinfo.io?token=YOUR_API_TOKEN'); // Replace with your token
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }
        locationData = await response.json();
      } catch (err) {
        error = err.message;
      }
    }
  
    // Fetch location data when the component mounts
    onMount(() => {
      fetchLocationData();
    });
  </script>
  
  <style>
    .error {
      color: red;
      font-weight: bold;
    }
  
    .location-info {
      font-size: 1.2em;
      margin-top: 10px;
    }
  </style>
  
  {#if error}
    <div class="error">{error}</div>
  {:else if Object.keys(locationData).length === 0}
    <p>Fetching your location...</p>
  {:else}
    <div class="location-info">
      <p><strong>Your IP Address:</strong> {locationData.ip}</p>
      <p><strong>Location:</strong> {locationData.city}, {locationData.region}, {locationData.country}</p>
      <p><strong>Coordinates:</strong> {locationData.loc}</p>
      <p><strong>ISP:</strong> {locationData.org}</p>
    </div>
  {/if}
  