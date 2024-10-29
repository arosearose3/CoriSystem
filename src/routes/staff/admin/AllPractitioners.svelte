<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; // Import base path
    let practitioners = [];
    let message = '';
    let sortField = 'name';
    let sortDirection = 'asc';
  
    // Fetch all practitioners on component mount
    onMount(async () => {
      await fetchPractitioners();
    });
  
    // Fetch practitioners from the API
    async function fetchPractitioners() {
      try {
        const response = await fetch(`${base}/api/practitioner/all`);
        const data = await response.json();
  
        if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
          practitioners = data.entry.map(entry => ({
            id: entry.resource.id || '',
            name: entry.resource.name[0]?.given?.join(' ') + ' ' + entry.resource.name[0]?.family || 'Unknown',
            birthDate: entry.resource.birthDate || 'Unknown'
          }));
        } else {
          throw new Error('Invalid Practitioner FHIR Bundle format');
        }
      } catch (error) {
        console.error('Error fetching practitioners:', error);
        message = 'Error fetching practitioners. Please try again.';
      }
    }
  
    // Handle delete functionality (stub)
    async function deletePractitioner(id) {
      if (confirm('Are you sure you want to delete this practitioner?')) {
        // Perform delete operation here (stub)
        console.log(`Delete practitioner with ID: ${id}`);
        // TODO: Implement actual deletion via API
      }
    }
  
    // Sort the table by the selected column
    function sortTable(field) {
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'asc';
      }
      practitioners = practitioners.sort((a, b) => {
        let valA = a[field].toLowerCase();
        let valB = b[field].toLowerCase();
        if (sortDirection === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
    }
  </script>
  
  <style>
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
  
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
  
    th {
      background-color: #f2f2f2;
      cursor: pointer;
    }
  
    th:hover {
      background-color: #ddd;
    }
  
    .delete-icon {
      cursor: pointer;
      color: red;
    }
  
    .message {
      color: red;
      margin-top: 10px;
    }
  </style>
  
  <div>
    <h2>All Practitioners</h2>
  
    {#if message}
      <p class="message">{message}</p>
    {/if}
  
    <table>
      <thead>
        <tr>
          <th>Delete</th>
          <th on:click={() => sortTable('name')}>Practitioner Name {sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</th>
          <th on:click={() => sortTable('birthDate')}>Date of Birth {sortField === 'birthDate' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</th>
        </tr>
      </thead>
      <tbody>
        {#each practitioners as practitioner}
          <tr>
            <td><span class="delete-icon" on:click={() => deletePractitioner(practitioner.id)}>🗑️</span></td>
            <td>{practitioner.name}</td>
            <td>{practitioner.birthDate}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  