<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; // Import base path

    let patients = [];
    let message = '';
    let sortKey = 'name'; // Default sorting by name
    let sortDirection = 'asc'; // Default sort direction is ascending
  
    onMount(() => {
        console.log ("clients/admin/all init");
    async function loadPatients() {
        console.log("clients/admin/loadPatients");
        await fetchPatients();
        console.log("clients/admin/loadPatients doneloading");
    }

    // Call the async function inside onMount
    loadPatients();
});
  
    // Fetch patients from the API
    async function fetchPatients() {
      try {
        const response = await fetch(`${base}/api/patient/all`);
        const data = await response.json();
  
        // Check if the response is a valid FHIR Bundle
        if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
          patients = data.entry.map(entry => {
            const patient = entry.resource;
            return {
              id: patient.id || '',
              name: `${patient.name?.[0]?.given?.join(' ') || ''} ${patient.name?.[0]?.family || ''}`,
              birthDate: patient.birthDate || 'Unknown',
              managingOrganization: patient.managingOrganization?.reference || 'Unknown',
              generalPractitioner: patient.generalPractitioner?.[0]?.reference || 'Unknown'
            };
          });
        } else {
          throw new Error('Invalid FHIR Bundle format');
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
        message = 'Error fetching patients. Please try again.';
      }
    }
  
    // Sort patients by a specific key
    function sortBy(key) {
      if (sortKey === key) {
        // Toggle the sorting direction if the same column is clicked
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Set the new sorting key
        sortKey = key;
        sortDirection = 'asc';
      }
  
      patients.sort((a, b) => {
        let comparison = 0;
  
        if (a[key] > b[key]) {
          comparison = 1;
        } else if (a[key] < b[key]) {
          comparison = -1;
        }
  
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
  
    // Stub delete handler
    function handleDelete(patientId) {
      console.log(`Delete patient with ID: ${patientId}`);
      // Add logic to delete the patient from the server and refresh the table
    }
  </script>
  
  <style>
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
  
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
  
    button.delete-btn {
      background-color: red;
      color: white;
      border: none;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 4px;
    }
  
    .message {
      margin-top: 15px;
      padding: 10px;
      background-color: #f0f0f0;
      border-radius: 4px;
    }
  </style>
  
  <div class="container">
    <h2>All Clients (Patients)</h2>
  
    {#if message}
      <p class="message">{message}</p>
    {/if}
  
    <table>
      <thead>
        <tr>
          <th>Delete</th>
          <th on:click={() => sortBy('name')}>Name</th>
          <th on:click={() => sortBy('birthDate')}>Birthdate</th>
          <th on:click={() => sortBy('managingOrganization')}>Managing Organization</th>
          <th on:click={() => sortBy('generalPractitioner')}>General Practitioner</th>
        </tr>
      </thead>
      <tbody>
        {#each patients as patient}
          <tr>
            <td><button class="delete-btn" on:click={() => handleDelete(patient.id)}>🗑️</button></td>
            <td>{patient.name}</td>
            <td>{patient.birthDate}</td>
            <td>{patient.managingOrganization}</td>
            <td>{patient.generalPractitioner}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  