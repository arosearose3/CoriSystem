<script>
    import { createEventDispatcher } from 'svelte';
    import ActivityGroup from './ActivityGroup.svelte';
  
    const dispatch = createEventDispatcher();
  
    const categories = [
      {
        name: 'FHIR Events',
        description: 'FHIR resource changes',
        items: [
          { 
            type: 'fhirchange',
            title: 'FHIR Resource Change',
            properties: {
              resourceType: { type: 'string', label: 'Resource Type', required: true },
              changeType: { type: 'array', label: 'Change Types', options: ['create', 'update', 'delete'] },
              searchCriteria: { type: 'string', label: 'Search Criteria' }
            }
          }
        ]
      },
      {
        name: 'System Events',
        description: 'System-level triggers',
        items: [
          {
            type: 'webhook',
            title: 'Webhook',
            properties: {
              endpoint: { type: 'string', label: 'Endpoint Path', required: true },
              secret: { type: 'string', label: 'Webhook Secret' },
              allowedIPs: { type: 'array', label: 'Allowed IP Addresses' }
            }
          },
          {
            type: 'timer',
            title: 'Timer',
            properties: {
              schedule: { type: 'string', label: 'CRON Schedule', required: true },
              timezone: { type: 'string', label: 'Timezone' },
              startDate: { type: 'date', label: 'Start Date' }
            }
          }
        ]
      }
    ];
  
  function handleDragStart(event, item) {
   event.stopPropagation();
  
  if (item) {
    const data = {
      type: item.type,
      title: item.title,
      properties: item.properties || {},
      isEvent: true,
      // Add any additional metadata needed by FlowNode
      width: 200,
      height: 80
    };
    
    // Set both formats for maximum compatibility
    event.dataTransfer.setData('application/json', JSON.stringify(data));
    event.dataTransfer.setData('text/plain', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copy';
    
    // Optional: Create drag image
    const dragImage = event.target.cloneNode(true);
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    dispatch('dragstart', { item });
  }
}
  </script>
  
  <div class="palette-container" on:dragstart|stopPropagation>
    <h5 class="text-lg font-semibold mb-4">Events</h5>
  
    {#each categories as category (category.name)}
    <ActivityGroup
      name={category.name}
      description={category.description}
    >
      {#each category.items as item (item.type)}
        <div
          class="palette-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, item)}
          on:mousedown|stopPropagation
        >
          <span class="select-text">{item.title}</span>
        </div>
      {/each}
    </ActivityGroup>
  {/each}
</div>

  <style>
      .palette-container {
    height: 100%;
    background: #f9fafb;
    padding: 1rem;
    overflow-y: auto;
  }

    .palette-item {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      margin: 0.25rem 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      cursor: grab;

      transition: all 0.2s;
    }
  
    .palette-item:hover {
      background: #f3f4f6;
      transform: translateX(2px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  
    .palette-item:active {
      cursor: grabbing;
      background: #e5e7eb;
    }

    .select-text {
    user-select: text;
    cursor: text;
  }

  /* But keep grab cursor on the draggable container */
  .palette-item .select-text:hover {
    cursor: grab;
  }

  </style>
