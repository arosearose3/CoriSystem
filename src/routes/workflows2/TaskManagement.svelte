<script>
  import { createEventDispatcher } from 'svelte';
  import Plus from 'lucide-svelte/icons/plus';
  import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
  import { onMount } from 'svelte';
  import TaskTemplate from './TaskTemplate.svelte';

  const dispatch = createEventDispatcher();

  let templates = [];
  let sortField = 'description';
  let sortDirection = 'asc';
  let showEditor = false;
  let selectedTemplate = null;

  // Columns configuration
  const columns = [
      { field: 'description', label: 'Description' },
      { field: 'id', label: 'ID' },
      { field: 'status', label: 'Status' },
      { field: 'intent', label: 'Intent' }
  ];

  async function loadTemplates() {
      try {
          const response = await fetch('/api/task-templates');
          templates = await response.json();
      } catch (error) {
          console.error('Error loading templates:', error);
      }
  }

  function handleSort(field) {
      if (sortField === field) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
          sortField = field;
          sortDirection = 'asc';
      }

      templates = templates.sort((a, b) => {
          const aVal = a[field]?.toLowerCase() ?? '';
          const bVal = b[field]?.toLowerCase() ?? '';
          return sortDirection === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
      });
  }

  function handleTemplateClick(template) {
      selectedTemplate = template;
      showEditor = true;
      dispatch('editTemplate', template);
  }

  function handleAddNew() {
      selectedTemplate = null;
      showEditor = true;
      dispatch('newTemplate');
  }

  // Listen for close editor event
  export function handleCloseEditor() {
      showEditor = false;
      selectedTemplate = null;
      loadTemplates(); // Reload to get any updates
  }

  // Load templates on mount
  onMount(loadTemplates);
</script>

<div class="p-4">
  {#if !showEditor}
      <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Task Templates</h1>
          <button
              class="btn btn-primary flex items-center"
              on:click={handleAddNew}
          >
              <Plus class="w-4 h-4 mr-2" />
              Add New Template
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
                  {#each templates as template}
                      <tr
                          class="hover:bg-gray-50 cursor-pointer"
                          on:click={() => handleTemplateClick(template)}
                      >
                          {#each columns as column}
                              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                                  {template[column.field]}
                              </td>
                          {/each}
                      </tr>
                  {/each}
              </tbody>
          </table>
      </div>
  {:else}
      <!-- Show TaskTemplate component instead of redirecting -->
      <TaskTemplate {selectedTemplate} on:closeEditor={handleCloseEditor} />
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
</style>
