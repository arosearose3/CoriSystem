<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    let loading = true;
    let error = null;
    let communications = [];
    let sortKey = 'time'; // Default sorting column
    let sortAsc = false;  // Default sorting order
  
    const loadCommunications = async () => {
      try {
        loading = true;
        const response = await fetch('/api/communication/allcomms');
        if (!response.ok) throw new Error('Failed to load communications');
        
        const data = await response.json();
        communications = data.entry?.map(e => ({
          id: e.resource.id,
          time: new Date(e.resource.sent),
          sender: decodeReference(e.resource.sender?.reference),
          receiver: decodeReference(e.resource.recipient?.[0]?.reference),
          body: e.resource.payload?.[0]?.contentString || ''
        })) || [];
      } catch (err) {
        error = err.message;
        console.error('Error loading communications:', err);
      } finally {
        loading = false;
      }
    };
  
    const deleteCommunication = async (id) => {
      try {
        const response = await fetch(`/api/communication/delete/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete communication');
        communications = communications.filter(c => c.id !== id);
      } catch (err) {
        console.error('Error deleting communication:', err);
      }
    };
  
    const decodeReference = (reference) => {
      if (!reference) return 'Unknown';
      const [type, id] = reference.split('/');
      return `${type} ${id}`;
    };
  
    const sortCommunications = (key) => {
      if (sortKey === key) {
        sortAsc = !sortAsc; // Toggle sort order if the same column is clicked
      } else {
        sortKey = key;
        sortAsc = true; // Default to ascending order for a new column
      }
      communications.sort((a, b) => {
        if (key === 'time') {
          return sortAsc ? a[key] - b[key] : b[key] - a[key];
        } else {
          return sortAsc 
            ? a[key]?.localeCompare(b[key]) 
            : b[key]?.localeCompare(a[key]);
        }
      });
    };
  
    onMount(() => {
      loadCommunications();
    });
  </script>
  
  <div class="communication-viewer">
    <h3>Communications</h3>
  
    {#if error}
      <div class="error">{error}</div>
    {/if}
  
    {#if loading}
      <div class="loading">Loading communications...</div>
    {:else if communications.length === 0}
      <div class="empty">No communications</div>
    {:else}
      <table class="communication-table">
        <thead>
          <tr>
            <th></th>
            <th on:click={() => sortCommunications('time')}>Time</th>
            <th on:click={() => sortCommunications('sender')}>Sender</th>
            <th on:click={() => sortCommunications('receiver')}>Receiver</th>
            <th>Body</th>
          </tr>
        </thead>
        <tbody>
          {#each communications as c (c.id)}
            <tr>
              <td><button class="delete-button" on:click={() => deleteCommunication(c.id)}>🗑</button></td>
              <td>{c.time.toLocaleString()}</td>
              <td>{c.sender}</td>
              <td>{c.receiver}</td>
              <td>{c.body}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
  
  <style>
    .communication-viewer {
      padding: 1rem;
      max-width: 1000px;
    }
  
    .communication-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
  
    .communication-table th, .communication-table td {
      border: 1px solid #ccc;
      padding: 0.5rem;
      text-align: left;
    }
  
    .communication-table th {
      cursor: pointer;
      background-color: #f9f9f9;
    }
  
    .delete-button {
      background: none;
      border: none;
      color: red;
      cursor: pointer;
    }
  
    .error {
      color: red;
      margin-bottom: 1rem;
    }
  
    .loading, .empty {
      text-align: center;
      color: #666;
      padding: 2rem;
    }
  </style>
  