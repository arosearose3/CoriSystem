<script>
    import { createEventDispatcher } from 'svelte';
    import Plus from 'lucide-svelte/icons/plus';
    import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
    import { onMount } from 'svelte';
    import EventAuthor from './EventAuthor.svelte';
  
    const dispatch = createEventDispatcher();
  
    let definitions = [];
    let sortField = 'name';
    let sortDirection = 'asc';
    let showEditor = false;
    let selectedDefinition = null;
  
    // Columns configuration
    const columns = [
      { field: 'name', label: 'Name' },
      { field: 'id', label: 'ID' },
      { field: 'type', label: 'Type' },
      { field: 'status', label: 'Status' },
    ];
  
    async function loadDefinitions() {
      try {
        const response = await fetch('/api/eventdefinition/all');
        definitions = await response.json();
        console.log('eventMgmt definitions: ', definitions);
        if (definitions.resourceType === 'Bundle') {
          definitions = definitions.entry
          .filter(entry => entry.resource.resourceType === 'EventDefinition')
          .map(entry => ({
              id: entry.resource.id,
              name: entry.resource.name,
              status: entry.resource.status,
              // Look for named-event trigger type which indicates a webhook
              type: entry.resource.trigger?.[0]?.type === 'named-event' ? 'webhook' : 'other',
              url: entry.resource.trigger?.[0]?.name || null // Webhook URL is stored in the trigger name
          }));
        }
      } catch (error) {
        console.error('Error loading event definitions:', error);
      }
    }
  
    async function deleteDefinition(definition) {
  if (!confirm(`Are you sure you want to delete "${definition.name}"?`)) {
    return;
  }
  try {
    const response = await fetch(`/api/eventdefinition/${definition.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete event definition');
    }

    alert(`Event "${definition.name}" deleted successfully!`);
    loadDefinitions(); // Reload the updated list
  } catch (error) {
    console.error('Error deleting event definition:', error);
    alert('Failed to delete event. See console for details.');
  }
}


    function handleSort(field) {
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'asc';
      }
  
      definitions = definitions.sort((a, b) => {
        const aVal = a[field]?.toLowerCase() ?? '';
        const bVal = b[field]?.toLowerCase() ?? '';
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }
  
    function handleDefinitionClick(definition) {
      selectedDefinition = definition;
      showEditor = true;
      dispatch('editDefinition', definition);
    }
  
    async function testWebhook(definition) {
      try {
        if (!definition.url) {
          alert('No webhook URL defined for this event.');
          return;
        }
        const response = await fetch(definition.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'Webhook Test Triggered' })
        });
  
        if (!response.ok) throw new Error('Failed to call webhook');
        alert(`Webhook ${definition.url} tested successfully!`);
      } catch (error) {
        console.error('Error testing webhook:', error);
        alert('Webhook test failed. See console for details.');
      }
    }
  
    function handleAddNew() {
      selectedDefinition = null;
      showEditor = true;
      dispatch('newDefinition');
    }
  
    export function handleCloseEditor() {
      showEditor = false;
      selectedDefinition = null;
      loadDefinitions(); // Reload to get any updates
    }
  
    onMount(loadDefinitions);
  </script>
  
  <div class="p-4">
    {#if !showEditor}
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Event Definitions</h1>
        <button class="btn btn-primary flex items-center" on:click={handleAddNew}>
          <Plus class="w-4 h-4 mr-2" />
          Add New Definition
        </button>
      </div>
  
      <div class="bg-white rounded-lg shadow">
        <table class="min-w-full">
          <thead>
            <tr>
              {#each columns as column}
                <th
                  class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  on:click={() => handleSort(column.field)}
                >
                  <div class="flex items-center">
                    {column.label}
                    <ArrowUpDown class="w-4 h-4 ml-1" />
                  </div>
                </th>
              {/each}
              <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white">
            {#each definitions as definition}
              <tr
                class="hover:bg-gray-50 cursor-pointer"
                on:click={() => handleDefinitionClick(definition)}
              >
                {#each columns as column}
                  <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                    {definition[column.field]}
                  </td>
                {/each}
                <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200 flex gap-2">
                  {#if definition.type === 'webhook'}
                    <button
                      class="btn btn-secondary"
                      on:click|stopPropagation={() => testWebhook(definition)}
                    >
                      Test
                    </button>
                  {/if}
                  <button
                    class="btn btn-danger"
                    on:click|stopPropagation={() => deleteDefinition(definition)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <EventAuthor {selectedDefinition} on:closeEditor={handleCloseEditor} />
    {/if}
  </div>
  
  <style>
    .btn-danger {
  background-color: #e53e3e;
  color: white;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-danger:hover {
  background-color: #c53030;
}

    .btn-primary {
      background-color: #007bff;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
  
    .btn-primary:hover {
      background-color: #0056b3;
    }
  
    .btn-secondary {
      background-color: #38b2ac;
      color: white;
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
  
    .btn-secondary:hover {
      background-color: #319795;
    }
  
    .bg-white {
      background-color: #fff;
    }
  
    .rounded-lg {
      border-radius: 0.5rem;
    }
  
    .shadow {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  
    .text-2xl {
      font-size: 1.5rem;
    }
  
    .font-bold {
      font-weight: 700;
    }
  
    .mb-6 {
      margin-bottom: 1.5rem;
    }
  
    .hover\:bg-gray-50:hover {
      background-color: #f9fafb;
    }
  
    table {
      width: 100%;
      border-collapse: collapse;
    }
  
    th,
    td {
      padding: 0.75rem;
      text-align: left;
    }
  </style>
  