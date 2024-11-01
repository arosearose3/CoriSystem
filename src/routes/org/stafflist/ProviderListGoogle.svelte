<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { 
    practitionersStore, 
    exclusionProvidersStore, 
    practitionersHelper,
    showActionButton,
    actionButtonText 
  } from '$lib/practitionersStore.js';
  
  export let selectedFile;
  
  const dispatch = createEventDispatcher();
  
  let loading = true;
  let sortField = 'lastName';
  let sortDirection = 1;
  let showConfirmDialog = false;
  let pendingActions = null;



  // Subscribe to stores
  $: providers = $exclusionProvidersStore;
  $: sortedProviders = [...providers].sort((a, b) => {
    if (a[sortField] < b[sortField]) return -1 * sortDirection;
    if (a[sortField] > b[sortField]) return 1 * sortDirection;
    return 0;
  });

  onMount(async () => {
    await loadProviders();
  });

  async function loadProviders() {
    try {
      loading = true;
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: selectedFile.id,
        range: 'A:D',
        key: import.meta.env.VITE_GOOGLE_EXCLUSION_API_KEY
      });

      const [headers, ...rows] = response.result.values || [[], []];
      const loadedProviders = rows.map(row => ({
        firstName: row[0] || '',  // Make sure first name is mapped from column A
        lastName: row[1] || '',   // Make sure last name is mapped from column B
        dob: row[2] || '',        // Make sure DOB is mapped from column C
        npi: row[3] || '',        // Make sure NPI is mapped from column D
        foundInCori: false,
        dobMatches: false,
        npiMatches: false,
        addToCori: false,
        deleteFromCori: false,
        importDOB: false,
        importNPI: false
      }));

      practitionersHelper.setExclusionProviders(loadedProviders);
    } catch (err) {
      dispatch('error', err.message);
    } finally {
      loading = false;
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      sortDirection *= -1;
    } else {
      sortField = field;
      sortDirection = 1;
    }
  }

  function handleActionClick() {
        pendingActions = practitionersHelper.getActionsToPerform();
        showConfirmDialog = true;
    }



    async function handleConfirmedAction() {
      showConfirmDialog = false;
    const actions = practitionersHelper.getActionsToPerform();
    const results = {
        added: [],
        deleted: [],
        dobUpdated: [],
        npiUpdated: [],
        errors: []
    };

    try {
        // Handle additions
        if (actions.toAdd.length > 0) {
            for (const provider of actions.toAdd) {
                try {
                    const response = await fetch(`${base}/api/practitioner/create`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(provider)
                    });
                    
                    if (!response.ok) throw new Error(`Failed to add ${provider.firstName} ${provider.lastName}`);
                    results.added.push(provider);
                } catch (err) {
                    results.errors.push({ action: 'add', provider, error: err.message });
                }
            }
        }

        // Handle deletions
        if (actions.toDelete.length > 0) {
            for (const provider of actions.toDelete) {
                try {
                    // You'll need to get the practitionerId from somewhere
                    const practitionerId = await findPractitionerId(provider);
                    const response = await fetch(`${base}/api/practitioner/delete/${practitionerId}`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) throw new Error(`Failed to delete ${provider.firstName} ${provider.lastName}`);
                    results.deleted.push(provider);
                } catch (err) {
                    results.errors.push({ action: 'delete', provider, error: err.message });
                }
            }
        }

        // Handle DOB updates
        if (actions.toUpdateDOB.length > 0) {
            for (const provider of actions.toUpdateDOB) {
                try {
                    const practitionerId = await findPractitionerId(provider);
                    const response = await fetch(`${base}/api/practitioner/update/${practitionerId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ birthDate: provider.dob })
                    });
                    
                    if (!response.ok) throw new Error(`Failed to update DOB for ${provider.firstName} ${provider.lastName}`);
                    results.dobUpdated.push(provider);
                } catch (err) {
                    results.errors.push({ action: 'update DOB', provider, error: err.message });
                }
            }
        }

        // Handle NPI updates
        if (actions.toUpdateNPI.length > 0) {
            for (const provider of actions.toUpdateNPI) {
                try {
                    const practitionerId = await findPractitionerId(provider);
                    const response = await fetch(`${base}/api/practitioner/update/${practitionerId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            identifier: [{
                                system: 'http://hl7.org/fhir/sid/us-npi',
                                value: provider.npi
                            }]
                        })
                    });
                    
                    if (!response.ok) throw new Error(`Failed to update NPI for ${provider.firstName} ${provider.lastName}`);
                    results.npiUpdated.push(provider);
                } catch (err) {
                    results.errors.push({ action: 'update NPI', provider, error: err.message });
                }
            }
        }

        // Show results summary
        displayResults(results);

        // Refresh the data
        if (results.added.length || results.deleted.length || 
            results.dobUpdated.length || results.npiUpdated.length) {
            await loadProviders();
        }

    } catch (err) {
        console.error('Error performing actions:', err);
        // Show error message to user
    }
}


// Helper function to find practitionerId by matching name
async function findPractitionerId(provider) {
    const coriProviders = get(practitionersStore); // Using Svelte's get helper
    const match = coriProviders.find(p => 
        p.firstName.toLowerCase() === provider.firstName.toLowerCase() &&
        p.lastName.toLowerCase() === provider.lastName.toLowerCase()
    );
    if (!match) throw new Error(`Could not find matching provider in Cori: ${provider.firstName} ${provider.lastName}`);
    return match.id;
}

// Helper function to display results
function displayResults(results) {
    let message = 'Action Results:\n\n';
    
    if (results.added.length) {
        message += `Added ${results.added.length} providers\n`;
    }
    if (results.deleted.length) {
        message += `Deleted ${results.deleted.length} providers\n`;
    }
    if (results.dobUpdated.length) {
        message += `Updated DOB for ${results.dobUpdated.length} providers\n`;
    }
    if (results.npiUpdated.length) {
        message += `Updated NPI for ${results.npiUpdated.length} providers\n`;
    }
    if (results.errors.length) {
        message += `\nErrors:\n${results.errors.map(e => 
            `${e.action} failed for ${e.provider.firstName} ${e.provider.lastName}: ${e.error}`
        ).join('\n')}`;
    }

    alert(message); // You might want to use a more sophisticated notification system
}

</script>

<div class="overflow-x-auto">

  {#if showConfirmDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">Are you sure you want to do this?</h2>
          
          <div class="mb-6">
              {#if pendingActions.toAdd.length > 0}
                  <div class="mb-4">
                      <h3 class="font-semibold text-blue-600">Add {pendingActions.toAdd.length} providers:</h3>
                      <ul class="list-disc ml-6 mt-2">
                          {#each pendingActions.toAdd as provider}
                              <li>{provider.firstName} {provider.lastName}</li>
                          {/each}
                      </ul>
                  </div>
              {/if}

              {#if pendingActions.toDelete.length > 0}
                  <div class="mb-4">
                      <h3 class="font-semibold text-red-600">Delete {pendingActions.toDelete.length} providers:</h3>
                      <ul class="list-disc ml-6 mt-2">
                          {#each pendingActions.toDelete as provider}
                              <li>{provider.firstName} {provider.lastName}</li>
                          {/each}
                      </ul>
                  </div>
              {/if}

              {#if pendingActions.toUpdateDOB.length > 0}
                  <div class="mb-4">
                      <h3 class="font-semibold text-yellow-600">Update DOB for {pendingActions.toUpdateDOB.length} providers:</h3>
                      <ul class="list-disc ml-6 mt-2">
                          {#each pendingActions.toUpdateDOB as provider}
                              <li>{provider.firstName} {provider.lastName} → {provider.dob}</li>
                          {/each}
                      </ul>
                  </div>
              {/if}

              {#if pendingActions.toUpdateNPI.length > 0}
                  <div class="mb-4">
                      <h3 class="font-semibold text-yellow-600">Update NPI for {pendingActions.toUpdateNPI.length} providers:</h3>
                      <ul class="list-disc ml-6 mt-2">
                          {#each pendingActions.toUpdateNPI as provider}
                              <li>{provider.firstName} {provider.lastName} → {provider.npi}</li>
                          {/each}
                      </ul>
                  </div>
              {/if}
          </div>

          <div class="flex justify-end space-x-4">
              <button 
                  class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  on:click={() => showConfirmDialog = false}
              >
                  Cancel
              </button>
              <button 
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  on:click={handleConfirmedAction}
              >
                  Proceed
              </button>
          </div>
      </div>
  </div>
{/if}


  {#if loading}
    <div class="flex justify-center items-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  {:else}
  <div class="mb-4 min-h-[48px]">


{#if $showActionButton}
    <button 
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        on:click={handleActionClick}
    >
        {$actionButtonText}
    </button>
{/if}
  </div>

  <table class="min-w-full bg-white">
    <thead>
      <tr>
        <th>First Name</th>
        <th>Last Name</th>
        <th>DOB</th>
        <th>NPI</th>
        <th class="text-center">Found In Cori</th>
        <th class="text-center">DOB Matches</th>
        <th class="text-center">NPI Matches</th>
        <th class="text-center">Import DOB</th>
        <th class="text-center">Import NPI</th>
        <th class="text-center">Add To Cori</th>
        <th class="text-center">Delete From Cori</th>
      </tr>
    </thead>
    <tbody>
      {#each sortedProviders as provider}
        <tr>
          <td>{provider.firstName}</td>
          <td>{provider.lastName}</td>
          <td>{provider.dob}</td>
          <td>{provider.npi}</td>
          <td class="text-center">
            {#if provider.foundInCori}
              <span class="text-green-600">✓</span>
            {:else}
              <span class="text-red-600">✗</span>
            {/if}
          </td>
          <td class="text-center">
            {#if provider.dobMatches}
              <span class="text-green-600">✓</span>
            {:else}
              <span class="text-red-600">✗</span>
            {/if}
          </td>
          <td class="text-center">
            {#if provider.npiMatches}
              <span class="text-green-600">✓</span>
            {:else}
              <span class="text-red-600">✗</span>
            {/if}
          </td>
          <td class="text-center">
            <input 
              type="checkbox" 
              checked={provider.importDOB}
              on:change={() => practitionersHelper.toggleImportDOB(provider)}
              class="form-checkbox h-5 w-5 text-yellow-600"
              disabled={!provider.foundInCori || provider.dobMatches}
            >
          </td>
          <td class="text-center">
            <input 
              type="checkbox" 
              checked={provider.importNPI}
              on:change={() => practitionersHelper.toggleImportNPI(provider)}
              class="form-checkbox h-5 w-5 text-yellow-600"
              disabled={!provider.foundInCori || provider.npiMatches}
            >
          </td>
          <td class="text-center">
            <input 
              type="checkbox" 
              checked={provider.addToCori}
              on:change={() => practitionersHelper.toggleAdd(provider)}
              class="form-checkbox h-5 w-5 text-blue-600"
              disabled={provider.foundInCori}
            >
          </td>
          <td class="text-center">
            <input 
              type="checkbox" 
              checked={provider.deleteFromCori}
              on:change={() => practitionersHelper.toggleDelete(provider)}
              class="form-checkbox h-5 w-5 text-red-600"
              disabled={!provider.foundInCori}
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
    {/if}
</div>
