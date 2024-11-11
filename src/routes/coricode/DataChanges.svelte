<script>
    import { onMount } from 'svelte';
    import DataChangeEventEditor from './Events/DataChangeEventEditor.svelte';
    import axios from 'axios';
  
    let events = [];
    let loading = true;
    let error = null;
    let selectedEvent = null;
    let showEditor = false;
  
    async function loadEvents() {
      try {
        loading = true;
        const response = await axios.get('/api/templates/events/search/byType', {
          params: { type: 'data-changed' }
        });
  
        // Process the Basic resources into more usable format
        events = response.data.map(event => ({
          id: event.id,
          name: event.extension[0].extension.find(e => e.url === 'name')?.valueString,
          resourceType: event.extension[0].extension.find(e => e.url === 'resourceType')?.valueString,
          operation: event.extension[0].extension.find(e => e.url === 'operation')?.valueString,
          description: event.extension[0].extension.find(e => e.url === 'description')?.valueString,
          filters: event.extension[0].extension.find(e => e.url === 'filters')?.valueString || 'None'
        }));
      } catch (e) {
        error = e.message;
      } finally {
        loading = false;
      }
    }
  
    async function handleDelete(eventId) {
      if (!confirm('Are you sure you want to delete this event?')) return;
      
      try {
        await axios.delete(`/api/templates/events/${eventId}`);
        await loadEvents();
      } catch (e) {
        alert('Failed to delete event: ' + e.message);
      }
    }
  
    function handleEdit(event) {
      selectedEvent = event;
      showEditor = true;
    }
  
    function handleAdd() {
      selectedEvent = null;
      showEditor = true;
    }
  
    function handleEditorClose() {
      selectedEvent = null;
      showEditor = false;
    }
  
    async function handleEditorSave() {
      await loadEvents();
      showEditor = false;
      selectedEvent = null;
    }
  
    onMount(loadEvents);
  </script>
  
  {#if !showEditor}
    <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Data Change Events</h2>
        <button
          on:click={handleAdd}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Data Change Event
        </button>
      </div>
  
      {#if loading}
        <div class="text-center py-4">Loading events...</div>
      {:else if error}
        <div class="text-red-500 py-4">{error}</div>
      {:else if events.length === 0}
        <div class="text-center py-4 text-gray-500">No data change events configured</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white">
            <thead>
              <tr class="bg-gray-100">
                <th class="px-6 py-3 text-left">Name</th>
                <th class="px-6 py-3 text-left">Resource Type</th>
                <th class="px-6 py-3 text-left">Operation</th>
                <th class="px-6 py-3 text-left">Filters</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each events as event}
                <tr class="border-b hover:bg-gray-50">
                  <td
                    class="px-6 py-4 transition-all hover:font-bold cursor-pointer"
                    on:click={() => handleEdit(event)}
                  >
                    {event.name}
                  </td>
                  <td class="px-6 py-4">{event.resourceType}</td>
                  <td class="px-6 py-4">{event.operation}</td>
                  <td class="px-6 py-4">{event.filters}</td>
                  <td class="px-6 py-4 text-right">
                    <button
                      on:click={() => handleDelete(event.id)}
                      class="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    <DataChangeEventEditor
      event={selectedEvent}
      on:save={handleEditorSave}
      on:cancel={handleEditorClose}
    />
  {/if}