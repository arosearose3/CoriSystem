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
      { field: 'status', label: 'Status' }
  ];

  async function loadDefinitions() {
      try {
          const response = await fetch('/api/eventdefinition/all');
          definitions = await response.json();
          console.log ("eventMgmt definitions: ", definitions);
          if (definitions.resourceType === 'Bundle') {
              definitions = definitions.entry
                  .filter(entry => entry.resource.resourceType === 'EventDefinition')
                  .map(entry => ({
                      id: entry.resource.id,
                      name: entry.resource.name,
                      type: entry.resource.type,
                      status: entry.resource.status
                  }));
          }
         

      } catch (error) {
          console.error('Error loading event definitions:', error);
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

  function handleAddNew() {
      selectedDefinition = null;
      showEditor = true;
      dispatch('newDefinition');
  }

  // Listen for close editor event
  export function handleCloseEditor() {
      showEditor = false;
      selectedDefinition = null;
      loadDefinitions(); // Reload to get any updates
  }

  // Load definitions on mount
  onMount(loadDefinitions);
</script>

<div class="p-4">
  {#if !showEditor}
      <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Event Definitions</h1>
          <button
              class="btn btn-primary flex items-center"
              on:click={handleAddNew}
          >
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
                      </tr>
                  {/each}
              </tbody>
          </table>
      </div>
  {:else}
      <!-- Show EventAuthor component instead of redirecting -->
      <EventAuthor {selectedDefinition} on:closeEditor={handleCloseEditor} />
  {/if}
</div>

<style>
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

  .mb-4 {
      margin-bottom: 1rem;
  }
</style>
