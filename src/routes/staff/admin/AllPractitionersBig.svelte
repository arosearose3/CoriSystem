<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths'; // Import base path
  import EditPractitioner from './EditPractitioner.svelte';

  let showEditForm = false;
  let selectedPractitionerId = null;

  let practitioners = [];
  let isLoading = true;
  let error = null;
  let sortColumn = 'name';
  let sortAscending = true;


  onMount(async() => {
    await fetchPractitioners();  // Direct call
    window.addEventListener('edit-practitioner', handleEditPractitioner);
    return () => {
      window.removeEventListener('edit-practitioner', handleEditPractitioner);
    };
  });
 

  async function fetchPractitioners() {
    try {
      const response = await fetch(`${base}/api/practitioner/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      practitioners = processPractitionerBundle(data); // Process the FHIR bundle
      sortPractitioners();
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  function processPractitionerBundle(PArray) {
  // Ensure PArray is an array
  if (!Array.isArray(PArray)) {
    return [];
  }

  // Process the entries in the array
  const practitioners = PArray.map((entry) => {
    const resource = entry.resource;

    // Check if the resource is a Practitioner and extract the necessary data
    if (resource && resource.resourceType === 'Practitioner') {
      return {
        id: resource.id || '',
        name: resource.name || [],
        telecom: resource.telecom || [],
        gender: resource.gender || 'unknown',
        birthDate: resource.birthDate || 'N/A',
      };
    }
    return null;
  }).filter(practitioner => practitioner !== null); // Filter out null values

  return practitioners;
}

  function formatName(name) {
    if (!name || !name.length) return 'N/A';
    const { given, family } = name[0];
    return `${given ? given.join(' ') : ''} ${family || ''}`.trim();
  }

  function formatTelecom(telecom) {
    if (!telecom || !telecom.length) return 'N/A';
    const email = telecom.find(t => t.system === 'email');
    return email ? email.value : 'N/A';
  }

  function sortPractitioners() {
    practitioners = practitioners.sort((a, b) => {
      let valueA, valueB;
      switch (sortColumn) {
        case 'name':
          valueA = formatName(a.name);
          valueB = formatName(b.name);
          break;
        case 'email':
          valueA = formatTelecom(a.telecom);
          valueB = formatTelecom(b.telecom);
          break;
        case 'gender':
          valueA = a.gender || '';
          valueB = b.gender || '';
          break;
        case 'birthDate':
          valueA = a.birthDate || '';
          valueB = b.birthDate || '';
          break;
      }
      return sortAscending 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    });
  }

  function handleSort(column) {
    if (sortColumn === column) {
      sortAscending = !sortAscending;
    } else {
      sortColumn = column;
      sortAscending = true;
    }
    sortPractitioners();
  }

  async function deletePractitioner(id) {
  try {
    const response = await fetch(`${base}/api/practitioner/deletePractitionerAndPractitionerRoles/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete practitioner with ID ${id}`);
    }
    
    // Remove the practitioner from the array after successful deletion
    practitioners = practitioners.filter(practitioner => practitioner.id !== id);
  } catch (error) {
    console.error('Error deleting practitioner:', error.message);
  }
}

function openEditForm(practitionerId) {
    // Create a custom event to open the modal
    const event = new CustomEvent('edit-practitioner', {
      detail: { practitionerId }
    });
    window.dispatchEvent(event);
  }
  function handleEditPractitioner(event) {
    selectedPractitionerId = event.detail.practitionerId;
    showEditForm = true;
  }


</script>


<div class="all-practitioners">

    {#if showEditForm}
    <EditPractitioner 
      practitionerId={selectedPractitionerId} 
      onClose={() => showEditForm = false}
    />
    {/if}
  <h2>All Practitioners</h2>

  {#if isLoading}
    <p>Loading practitioners...</p>
  {:else if error}
    <p class="error">Error: {error}</p>
  {:else if practitioners.length === 0}
    <p>No practitioners found.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th></th>
          <th on:click={() => handleSort('name')}>
            Name {sortColumn === 'name' ? (sortAscending ? '▲' : '▼') : ''}
          </th>
          <th on:click={() => handleSort('email')}>
            Email {sortColumn === 'email' ? (sortAscending ? '▲' : '▼') : ''}
          </th>
          <th on:click={() => handleSort('gender')}>
            Gender {sortColumn === 'gender' ? (sortAscending ? '▲' : '▼') : ''}
          </th>
          <th on:click={() => handleSort('birthDate')}>
            Birth Date {sortColumn === 'birthDate' ? (sortAscending ? '▲' : '▼') : ''}
          </th>
        </tr>
      </thead>
      <tbody>
        {#each practitioners as practitioner}
          <tr>
            <td>
              <button on:click={() => deletePractitioner(practitioner.id)} class="delete-btn" aria-label="Delete practitioner">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </td>
            <td on:click={() => openEditForm(practitioner.id)} class="name-cell">
              {formatName(practitioner.name)}
            </td>
            <td>
              {#if formatTelecom(practitioner.telecom) !== 'N/A'}
               
                  {formatTelecom(practitioner.telecom)}
              
              {:else}
                N/A
              {/if}
            </td>
            <td>{practitioner.gender || 'N/A'}</td>
            <td>{practitioner.birthDate || 'N/A'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>

.name-cell {
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .name-cell:hover {
    transform: scale(1.05);
    background-color: #f0f0f0;
  }

  .all-practitioners {
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
    font-weight: bold;
    cursor: pointer;
  }

  th:hover {
    background-color: #e6e6e6;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  .error {
    color: red;
  }

  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #ff4136;
    padding: 0;
  }

  .delete-btn:hover {
    color: #ff1a1a;
  }
</style>
