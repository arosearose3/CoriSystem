<script>
    import { createEventDispatcher } from 'svelte';
    import Plus from 'lucide-svelte/icons/plus';
    import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
    import { onMount } from 'svelte';
    import ActivityTemplate from './ActivityDefinitionEditor.svelte';
  
    const dispatch = createEventDispatcher();
  
    let templates = [];
    let sortField = 'description';
    let sortDirection = 'asc';
    let showEditor = false;
    let selectedTemplate = null;
  
    // Columns configuration, adding Delete column
    const columns = [
        { field: 'description', label: 'Description' },
        { field: 'id', label: 'ID' },
        { field: 'status', label: 'Status' },
        { field: 'intent', label: 'Intent' },
        { field: 'delete', label: 'Delete' } // Add Delete column
    ];
  
    async function loadTemplates() {
        try {
            const response = await fetch('/api/activitydefinition/all');
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
  
    async function handleDelete(templateId) {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }
        try {
            const response = await fetch(`/api/activitydefinition/delete/${templateId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                templates = templates.filter(template => template.id !== templateId);
            } else {
                console.error('Failed to delete template:', await response.json());
            }
        } catch (error) {
            console.error('Error deleting template:', error);
        }
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
            <h1 class="text-2xl font-bold">Activity Templates</h1>
            <button
                class="btn btn-primary flex items-center"
                on:click={handleAddNew}
            >
                <Plus class="w-4 h-4 mr-2" />
                Add New Activity
            </button>
        </div>
  
        <div class="bg-white rounded-lg shadow">
            <table class="min-w-full">
                <thead>
                    <tr>
                        {#each columns as column}
                            <th
                                class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                on:click={() => column.field !== 'delete' && handleSort(column.field)}
                            >
                                <div class="flex items-center">
                                    {column.label}
                                    {#if column.field !== 'delete'}
                                        <ArrowUpDown class="w-4 h-4 ml-1" />
                                    {/if}
                                </div>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody class="bg-white">
                    {#each templates as template}
                        <tr class="hover:bg-gray-50">
                            {#each columns as column}
                                <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                                    {#if column.field === 'delete'}
                                        <button
                                            class="btn btn-danger text-xs"
                                            on:click={() => handleDelete(template.id)}
                                        >
                                            Delete
                                        </button>
                                    {:else}
                                        {template[column.field]}
                                    {/if}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <!-- Show ActivityTemplate component instead of redirecting -->
        <ActivityTemplate {selectedTemplate} on:cancel={handleCloseEditor} />
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
  
    .btn-danger {
        background-color: #dc3545;
        color: white;
        padding: 0.25rem 0.5rem;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
    }
  
    .btn-danger:hover {
        background-color: #c82333;
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
  