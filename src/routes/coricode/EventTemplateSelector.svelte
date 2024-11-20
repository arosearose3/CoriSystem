<!-- src/lib/components/EventTemplateSelector.svelte -->
<script>
    import { onMount } from 'svelte';
    import { getAllEventTemplates } from '$lib/api/eventTemplates';
  
    export let selectedEvent = null;
    export let onEventSelected = (event) => {};
  
    let loading = false;
    let error = null;
    let templates = [];
  
    async function loadTemplates() {
      try {
        loading = true;
        templates = await getAllEventTemplates();
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
  
    function handleSelect(template) {
      selectedEvent = template;
      onEventSelected(template);
    }
  
    onMount(loadTemplates);
  </script>
  
  {#if loading}
    <div class="loading">Loading event templates...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <div class="event-templates">
      <h3>Select Trigger Event</h3>
      
      <div class="template-list">
        {#each templates as template}
          <div 
            class="template-card" 
            class:selected={selectedEvent?.id === template.id}
            on:click={() => handleSelect(template)}
          >
            <h4>{template.name || 'Unnamed Template'}</h4>
            <div class="details">
              <p>Resource: {template.extension[0].extension.find(e => e.url === 'resourceType').valueString}</p>
              <p>Property: {template.extension[0].extension.find(e => e.url === 'watchProperty').valueString}</p>
              {#if template.extension[0].extension.find(e => e.url === 'filters')}
                <p>Filters: {template.extension[0].extension.find(e => e.url === 'filters').valueString}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <style>
    .event-templates {
      padding: 1rem;
    }
  
    .template-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
  
    .template-card {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 1rem;
      cursor: pointer;
    }
  
    .template-card:hover {
      background-color: #f5f5f5;
    }
  
    .selected {
      border-color: #007bff;
      background-color: #e7f1ff;
    }
  
    .details {
      font-size: 0.9rem;
      color: #666;
    }
  
    .details p {
      margin: 0.25rem 0;
    }
  </style>