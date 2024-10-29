<script>
    import { onMount } from 'svelte';
    export let currentPatientId;
    let consents = [];
  
    // Fetch existing consents when component is mounted
    async function fetchConsents() {
      try {
        const response = await fetch(`/consents/list?patientId=${currentPatientId}`);
        consents = await response.json();
      } catch (error) {
        console.error('Error fetching consents:', error);
      }
    }
  
    onMount(fetchConsents);
  </script>
  
  <div class="consents-section">
    <h2>Consents</h2>
    <button on:click={() => alert('New Consent')}>New Consent</button>
  
    {#if consents.length > 0}
      <ul>
        {#each consents as consent}
          <li>{consent.id}: {consent.description}</li>
        {/each}
      </ul>
    {:else}
      <p>No consents found.</p>
    {/if}
  </div>
  
  <style>
    .consents-section {
    
    }
  
    ul {
      list-style-type: none;
      padding: 0;
    }
  
    li {
      padding: 10px 0;
    }
  
    button {
      padding: 10px;
      margin-bottom: 15px;
      background-color: #007bff;
      color: white;
      border: none;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #0056b3;
    }
  </style>
  