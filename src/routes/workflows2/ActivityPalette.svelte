<!-- lib/components/ActivityPalette.svelte -->
<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let templates = [];
  let error = null;
  let loading = true;

  const containerTemplates = [
    {
      id: 'parallel-container',
      type: 'parallel',
      title: 'Parallel Activities',
      description: 'Activities execute simultaneously',
      isContainer: true
    },
    {
      id: 'sequence-container',
      type: 'sequence',
      title: 'Sequential Activities',
      description: 'Activities execute in order',
      isContainer: true
    }
  ];

  function processActivityDefinition(resource) {
    if (resource.extension?.some(ext => 
    ext.url === 'http://your-system/task-event' && 
    ext.valueBoolean === true
      )) {
        return null;
      }

    return {
        id: resource.id,
        name: resource.name,
        title: resource.title,
        description: resource.description,
        type: 'activity',
        status: resource.status,
        kind: resource.kind,
        properties: {
            code: resource.code,
            priority: resource.priority,
            doNotPerform: resource.doNotPerform,
            timing: resource.timing,
            location: resource.location,
            participant: resource.participant
        },
        
        dynamicValue: resource.dynamicValue,
        isResponseNode: resource.dynamicValue?.some(dv => dv.path === '/Task/async/type'),
    };
}

onMount(async () => {
    try {
        const response = await fetch('/api/activitydefinition/all');
        if (!response.ok) throw new Error('Failed to fetch activity templates');
        const activities = await response.json();
        console.log('ActivityPalette: Raw activities:', activities);
        
        templates = activities
            .filter(activity => activity.resourceType === 'ActivityDefinition')
            // Filter out activities that are part of active tasks
            .filter(activity => 
                !activity.extension?.some(ext => 
                    ext.url === 'http://your-system/task-activity' && 
                    ext.valueBoolean === true
                )
            )
            .map(activity => processActivityDefinition(activity));
        
        console.log('ActivityPalette: Processed templates:', templates);
    } catch (err) {
        error = 'Failed to load activity templates';
        console.error('ActivityPalette error:', err);
    } finally {
        loading = false;
    }
});

function handleDragStart(event, template) {
    console.log('ActivityPalette: Starting drag for template:', template);
    event.stopPropagation();

    const data = template.isContainer ? {
        type: template.type,
        title: template.title,
        isContainer: true,
        width: 300,
        height: 200,
        children: []
    } : {
        type: 'activity',
        title: template.title || template.name || 'Untitled Activity',
        activityType: template.kind,
        properties: template.properties || {},
        isActivity: true,
        width: 200,
        height: 80,
        template: template.id,
        // ADD these properties:
        dynamicValue: template.dynamicValue,
        isResponseNode: template.isResponseNode
    };

    try {
        event.dataTransfer.setData('application/json', JSON.stringify(data));
        event.dataTransfer.setData('text/plain', JSON.stringify(data));
        event.dataTransfer.effectAllowed = 'copy';
    } catch (err) {
        console.error('Error in drag start:', err);
    }

    dispatch('dragstart', { template });
}
</script>

<!-- Template remains largely the same, just updated text -->

  <div class="palette-container">
    <h4 class="palette-title">Activities</h4>
  
    <!-- Container Templates -->
    <div class="container-templates">
     
      {#each containerTemplates as template (template.id)}
        <div
          class="palette-item container-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, template)}
        >
          <span class="item-title">{template.title}</span>
          <span class="item-description">{template.description}</span>
        </div>
      {/each}
    </div>
 
  

  {#if loading}
    <div class="loading">Loading activities...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if templates.length === 0}
    <div class="empty-state">No activity templates available</div>
  {:else}
    <div class="templates-list">
      {#each templates as template (template.id)}
        <div
          class="palette-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, template)}
        >
          <span class="item-title">
            {template.title || template.name || 'Untitled Activity'}
            {#if template.status !== 'active'}
              <span class="status-badge">{template.status}</span>
            {/if}
          </span>
          {#if template.description}
            <span class="item-description">{template.description}</span>
          {/if}
          {#if template.kind}
            <span class="activity-type">
              Type: {template.kind}
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