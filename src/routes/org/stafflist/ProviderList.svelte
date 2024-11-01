<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { 
      practitionersStore, 
      exclusionProvidersStore, 
      practitionersHelper,
      showActionButton,
      actionButtonText 
    } from '$lib/practitionersStore.js';
    import { base } from '$app/paths';

    
    export let selectedFile; // Now contains { name, data }
    
    const dispatch = createEventDispatcher();
    
    let loading = true;
    let sortField = 'lastName';
    let sortDirection = 1;
    let error = null;
    let showConfirmDialog = false;
    let pendingActions = null;
  
    // Subscribe to stores
    $: providers = $exclusionProvidersStore;
    $: sortedProviders = [...providers].sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortDirection;
      if (a[sortField] > b[sortField]) return 1 * sortDirection;
      return 0;
    });
  

    function formatDateToFHIR(dateStr) {
        if (!dateStr) return null;
        
        // Handle different input formats
        let date;
        
        // Try parsing different date formats
        if (dateStr.includes('/')) {
            // Handle MM/DD/YYYY
            const [month, day, year] = dateStr.split('/');
            date = new Date(year, month - 1, day);
        } else if (dateStr.includes('-')) {
            // Already in YYYY-MM-DD format
            return dateStr;
        } else {
            // Invalid format
            throw new Error(`Invalid date format: ${dateStr}`);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateStr}`);
        }

        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    async function patchPractitionerProperty(practitionerId, propertyPath, value) {
        if (!practitionerId) {
            throw new Error('Practitioner ID not found');
        }

        const response = await fetch(`${base}/api/practitioner/patchPractitioner/${practitionerId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                propertyPath,
                value
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update ${propertyPath}: ${response.statusText}`);
        }
    }

    async function addProvider(provider, organizationId) {
        console.log('Adding provider:', { provider, organizationId }); // Debug provider add

        if (!organizationId) {
            throw new Error('Organization ID is required');
        }

        if (!provider.firstName || !provider.lastName) {
            throw new Error('Complete name information is required');
        }

        const requestBody = {
            organizationId,
            name: [{
                given: [provider.firstName],
                family: provider.lastName,
                use: 'official'
            }]
        };

        // Only add optional fields if they exist
        if (provider.dob) {
            try {
                requestBody.birthDate = formatDateToFHIR(provider.dob);
            } catch (err) {
                throw new Error(`Invalid DOB format for ${provider.firstName} ${provider.lastName}: ${err.message}`);
            }
        }

        if (provider.npi) {
            requestBody.identifier = [{
                system: 'http://hl7.org/fhir/sid/us-npi',
                value: provider.npi
            }];
        }

        console.log('Provider request body:', requestBody); // Debug request body

        const response = await fetch(`${base}/api/role/createProvider`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Provider add error response:', errorText); // Debug error response
            throw new Error(`Failed to add provider: ${errorText}`);
        }

        return response.json();
    }

    async function deleteProvider(provider) {
        if (!provider.practitionerRoleId) {
            throw new Error('PractitionerRole ID not found');
        }

        const response = await fetch(`${base}/api/role/delete?practitionerRoleId=${provider.practitionerRoleId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete provider: ${response.statusText}`);
        }
    }

    async function updateProviderDOB(provider) {
        if (!provider.dob) {
            throw new Error('DOB is required for update');
        }

        try {
            const formattedDOB = formatDateToFHIR(provider.dob);
            await patchPractitionerProperty(
                provider.practitionerId,
                'birthDate',
                formattedDOB
            );
        } catch (err) {
            throw new Error(`Invalid DOB format for ${provider.firstName} ${provider.lastName}: ${err.message}`);
        }
    }

    async function updateProviderNPI(provider) {
        await patchPractitionerProperty(
            provider.practitionerId,
            'identifier',
            [{
                system: 'http://hl7.org/fhir/sid/us-npi',
                value: provider.npi
            }]
        );
    }

    async function processActionGroup(providers, actionType, actionFn, results) {
        for (const provider of providers) {
            try {
                await actionFn(provider);
                results[actionType].push(provider);
            } catch (err) {
                results.errors.push({
                    type: actionType,
                    provider,
                    error: err.message
                });
            }
        }
    }

    function formatResults(results) {
        let message = 'Action Results:\n\n';
        if (results.added.length) message += `✓ Added ${results.added.length} providers\n`;
        if (results.deleted.length) message += `✓ Deleted ${results.deleted.length} providers\n`;
        if (results.dobUpdated.length) message += `✓ Updated DOB for ${results.dobUpdated.length} providers\n`;
        if (results.npiUpdated.length) message += `✓ Updated NPI for ${results.npiUpdated.length} providers\n`;
        
        if (results.errors.length) {
            message += `\nErrors:\n${results.errors.map(e => 
                `✗ ${e.type} failed for ${e.provider.firstName} ${e.provider.lastName}: ${e.error}`
            ).join('\n')}`;
        }
        
        return message;
    }

    async function handleConfirmedAction() {
        showConfirmDialog = false;
        const actions = practitionersHelper.getActionsToPerform();
        
        console.log('Starting actions execution:', actions); // Debug actions

        if (!actions.organizationId) {
            error = 'Organization ID is not available';
            console.error('Missing organizationId:', actions); // Debug organizationId
            return;
        }

        let results = {
            added: [],
            deleted: [],
            dobUpdated: [],
            npiUpdated: [],
            errors: []
        };

        try {
            // For single provider add, ensure we process it
            if (actions.toAdd && actions.toAdd.length > 0) {
                console.log('Processing adds:', actions.toAdd); // Debug adds
                for (const provider of actions.toAdd) {
                    try {
                        if (!provider.firstName || !provider.lastName) {
                            throw new Error(`Invalid provider data: missing name`);
                        }
                        const result = await addProvider(provider, actions.organizationId);
                        console.log('Add result:', result); // Debug add result
                        results.added.push(provider);
                    } catch (err) {
                        console.error('Add provider error:', err); // Debug add error
                        results.errors.push({
                            type: 'add',
                            provider,
                            error: err.message
                        });
                    }
                }
            }

            // Process other actions using processActionGroup
            if (actions.toDelete?.length > 0) {
                await processActionGroup(
                    actions.toDelete,
                    'deleted',
                    provider => deleteProvider(provider),
                    results
                );
            }

            if (actions.toUpdateDOB?.length > 0) {
                await processActionGroup(
                    actions.toUpdateDOB,
                    'dobUpdated',
                    provider => updateProviderDOB(provider),
                    results
                );
            }

            if (actions.toUpdateNPI?.length > 0) {
                await processActionGroup(
                    actions.toUpdateNPI,
                    'npiUpdated',
                    provider => updateProviderNPI(provider),
                    results
                );
            }

            // Show results
            const message = formatResults(results);
            console.log('Action results:', results); // Debug results
            alert(message);

            // Refresh data if any changes were successful
            if (results.added.length || results.deleted.length || 
                results.dobUpdated.length || results.npiUpdated.length) {
                await loadProviders();
            }

        } catch (err) {
            console.error('Error performing actions:', err);
            error = 'Failed to complete actions. Please try again.';
            dispatch('error', error);
        }
    }


    onMount(async () => {
      await loadProviders();
    });
  
    async function loadProviders() {
      try {
        loading = true;
        // Set providers directly from CSV data
        practitionersHelper.setExclusionProviders(selectedFile.data);
      } catch (err) {
        error = err.message;
        dispatch('error', error);
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
        console.log('Pending Actions:', pendingActions); // Debug pending actions
        showConfirmDialog = true;
    }
  
    

  </script>
  
  <div class="overflow-x-auto">
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">{error}</span>
      </div>
    {/if}
  
    {#if loading}
      <div class="flex justify-center items-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    {:else}


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
            {#each ['firstName', 'lastName', 'dob', 'npi'] as field}
              <th 
                class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                on:click={() => handleSort(field)}
              >
                {field}
                {#if sortField === field}
                  <span class="ml-1">{sortDirection > 0 ? '↑' : '↓'}</span>
                {/if}
              </th>
            {/each}
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Found In Cori
            </th>
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              DOB Matches
            </th>
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              NPI Matches
            </th>
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Import DOB
            </th>
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Import NPI
            </th>
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Add To Cori
            </th>
            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
              Delete From Cori
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each sortedProviders as provider}
            <tr>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                {provider.firstName}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                {provider.lastName}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                {provider.dob}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                {provider.npi}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
                {#if provider.foundInCori}
                  <span class="text-green-600">✓</span>
                {:else}
                  <span class="text-red-600">✗</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
                {#if provider.dobMatches}
                  <span class="text-green-600">✓</span>
                {:else}
                  <span class="text-red-600">✗</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
                {#if provider.npiMatches}
                  <span class="text-green-600">✓</span>
                {:else}
                  <span class="text-red-600">✗</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
                <input 
                  type="checkbox" 
                  checked={provider.importDOB}
                  on:change={() => practitionersHelper.toggleImportDOB(provider)}
                  class="form-checkbox h-5 w-5 text-yellow-600"
                  disabled={!provider.foundInCori || provider.dobMatches}
                >
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
                <input 
                  type="checkbox" 
                  checked={provider.importNPI}
                  on:change={() => practitionersHelper.toggleImportNPI(provider)}
                  class="form-checkbox h-5 w-5 text-yellow-600"
                  disabled={!provider.foundInCori || provider.npiMatches}
                >
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
                <input 
                  type="checkbox" 
                  checked={provider.addToCori}
                  on:change={() => practitionersHelper.toggleAdd(provider)}
                  class="form-checkbox h-5 w-5 text-blue-600"
                  disabled={provider.foundInCori}
                >
              </td>
              <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-center">
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
  