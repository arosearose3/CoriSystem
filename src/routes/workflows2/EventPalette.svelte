<!-- lib/components/EventPalette.svelte - CHANGED -->
<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let templates = [];
  let error = null;
  let loading = true;

  // Reactive statement to log template changes
  $: if (templates) {
    console.log('EventPalette templates updated:', templates);
  }

  function processEventDefinition(resource) {
    return {
      id: resource.id,
      name: resource.name,
      title: resource.title,
      description: resource.description,
      type: 'event',
      trigger: resource.trigger,
      status: resource.status,
      properties: {
        webhook: resource.trigger?.[0]?.name,
        triggerType: resource.trigger?.[0]?.type,
        // Add any other properties you need from the EventDefinition
      }
    };
  }

  onMount(async () => {
    console.log('EventPalette: Fetching templates...');
    try {
      const response = await fetch('/api/eventdefinition/all');
      if (!response.ok) throw new Error('Failed to fetch event templates');
      const bundle = await response.json();
      console.log('EventPalette: Raw bundle:', bundle);
      
      if (bundle.resourceType !== 'Bundle') {
        throw new Error('Invalid response format: Not a FHIR Bundle');
      }

      // Process the bundle entries
      templates = bundle.entry
        .filter(entry => entry.resource.resourceType === 'EventDefinition')
        .map(entry => processEventDefinition(entry.resource));
      
      console.log('EventPalette: Processed templates:', templates);
    } catch (err) {
      error = 'Failed to load event templates';
      console.error('EventPalette error:', err);
    } finally {
      loading = false;
    }
  });

  function handleDragStart(event, template) {
    console.log('EventPalette: Starting drag for template:', template);
    event.stopPropagation();

    const data = {
      type: 'event',
      title: template.title ,
      eventType: template.type,
      properties: template.properties || {},
      isEvent: true,
      width: 200,
      height: 80,
      template: template.id,
      status: template.status,
      trigger: template.trigger
    };

    try {
      const jsonString = JSON.stringify(data);
      console.log('Setting drag data:', jsonString);
      
      event.dataTransfer.setData('application/json', jsonString);
      event.dataTransfer.setData('text/plain', jsonString);
      event.dataTransfer.effectAllowed = 'copy';

      // Verify the data was set
      console.log('Verifying data transfer:',
        event.dataTransfer.getData('application/json'),
        event.dataTransfer.getData('text/plain')
      );
    } catch (err) {
      console.error('Error in drag start:', err);
    }

    dispatch('dragstart', { template });
  }
</script>

<div class="palette-container">
  <h2 class="palette-title">Events</h2>

  {#if loading}
    <div class="loading">Loading events...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if templates.length === 0}
    <div class="empty-state">No event templates available</div>
  {:else}
    <div class="templates-list">
      {#each templates as template (template.id)}
        {@debug template}
        <div
          class="palette-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, template)}
        >
          <span class="item-title">
            {template.title || template.name || 'Untitled Event'}
            {#if template.status !== 'active'}
              <span class="status-badge">{template.status}</span>
            {/if}
          </span>
          {#if template.description}
            <span class="item-description">{template.description}</span>
          {/if}
          {#if template.trigger?.[0]?.name}
            <span class="trigger-info">
              Webhook: {template.trigger[0].name}
            </span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
  
  <style>

.status-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    background-color: #e5e7eb;
    color: #6b7280;
    margin-left: 0.5rem;
  }

  .trigger-info {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
    padding: 0.25rem;
    background-color: #f3f4f6;
    border-radius: 0.25rem;
    word-break: break-all;
  }

    .palette-container {
      background: #f9fafb;
      padding: 1rem;
      height: 100%;
      overflow-y: auto;
    }
  
    .palette-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #1f2937;
    }
  
    .loading {
      color: #6b7280;
      font-style: italic;
      padding: 1rem;
      text-align: center;
    }
  
    .error {
      color: #ef4444;
      padding: 1rem;
      text-align: center;
      background: #fee2e2;
      border-radius: 0.375rem;
    }
  
    .templates-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  
    .palette-item {
      display: flex;
      flex-direction: column;
      padding: 0.75rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      cursor: grab;
      transition: all 0.2s;
    }
  
    .palette-item:hover {
      transform: translateX(2px);
      background: #f3f4f6;
      border-color: #d1d5db;
    }
  
    .palette-item:active {
      cursor: grabbing;
    }
  
    .item-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }
  
    .item-description {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }
    .empty-state {
    color: #6b7280;
    font-style: italic;
    padding: 1rem;
    text-align: center;
    background: #f3f4f6;
    border-radius: 0.375rem;
  }

  </style>