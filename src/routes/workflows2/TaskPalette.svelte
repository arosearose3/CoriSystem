<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let templates = [];
  let error = null;
  let loading = true;

  // Reactive statement to log template changes
  $: if (templates) {
    console.log('TaskPalette templates updated:', templates);
  }

  function processTaskTemplate(resource) {
    return {
      id: resource.id,
      name: resource.name,
      title: resource.title,
      description: resource.description,
      type: 'task',
      status: resource.status,
      code: resource.code,
      properties: {
        // Transform any Task-specific properties here
        taskCode: resource.code?.coding?.[0]?.code,
        taskSystem: resource.code?.coding?.[0]?.system,
        taskDisplay: resource.code?.coding?.[0]?.display,
        // Add any other properties you need from the Task template
      }
    };
  }

  onMount(async () => {
    console.log('TaskPalette: Fetching templates...');
    try {
      const response = await fetch('/api/task/all');
      if (!response.ok) throw new Error('Failed to fetch task templates');
      const bundle = await response.json();
      console.log('TaskPalette: Raw bundle:', bundle);
      
      if (bundle.resourceType !== 'Bundle') {
        throw new Error('Invalid response format: Not a FHIR Bundle');
      }

      // Process the bundle entries
      templates = bundle.entry
        .filter(entry => entry.resource.resourceType === 'Task')
        .map(entry => processTaskTemplate(entry.resource));
      
      console.log('TaskPalette: Processed templates:', templates);
    } catch (err) {
      error = 'Failed to load task templates';
      console.error('TaskPalette error:', err);
    } finally {
      loading = false;
    }
  });

  function handleDragStart(event, template) {
    console.log('TaskPalette: Starting drag for template:', template);
    event.stopPropagation();

    const data = {
      type: 'task',
      title: template.title || template.name || 'Untitled Task',
      taskType: template.type,
      properties: template.properties || {},
      isTask: true,
      width: 200,
      height: 80,
      template: template.id,
      status: template.status,
      code: template.code
    };

    try {
      event.dataTransfer.setData('application/json', JSON.stringify(data));
      event.dataTransfer.setData('text/plain', JSON.stringify(data));
      event.dataTransfer.effectAllowed = 'copy';
      console.log('TaskPalette: Drag data set:', data);
    } catch (err) {
      console.error('TaskPalette: Error setting drag data:', err);
    }

    dispatch('dragstart', { template });
  }
</script>

<div class="palette-container">
  <h2 class="palette-title">Activities</h2>

  {#if loading}
    <div class="loading">Loading activities...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if templates.length === 0}
    <div class="empty-state">No task templates available</div>
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
            {template.title || template.name || 'Untitled Task'}
            {#if template.status !== 'active'}
              <span class="status-badge">{template.status}</span>
            {/if}
          </span>
          {#if template.description}
            <span class="item-description">{template.description}</span>
          {/if}
          {#if template.properties.taskDisplay}
            <span class="task-info">
              Type: {template.properties.taskDisplay}
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

  .task-info {
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
  </style>