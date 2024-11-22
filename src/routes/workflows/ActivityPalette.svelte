<script>
    import { createEventDispatcher } from 'svelte';
    import ActivityGroup from './ActivityGroup.svelte';
    import { atomicActivities } from '$lib/stores/activities';
    
    const dispatch = createEventDispatcher();
  
    const categories = [
      {
        name: 'Events',
        items: [
          { type: 'webhook', icon: 'Webhook', title: 'Webhook Event' },
          { type: 'fhir-change', icon: 'Database', title: 'FHIR Change' },
          { type: 'timer', icon: 'Clock', title: 'Timer Event' }
        ]
      },
      {
        name: 'Flow Control',
        items: [
          { type: 'parallel', icon: 'Split', title: 'Parallel Tasks' },
          { type: 'sequence', icon: 'List', title: 'Sequence' },
          { type: 'condition', icon: 'GitBranch', title: 'Condition' }
        ]
      }
    ];
  
    function handleDragStart(event, item) {
      event.dataTransfer.setData('application/json', JSON.stringify(item));
    }
  </script>
  
  <div class="h-full bg-gray-50 p-4">
    <h2 class="text-lg font-semibold mb-4">Activities</h2>
    
    {#each categories as category}
      <ActivityGroup name={category.name}>
        {#each category.items as item}
          <div
            class="flex items-center p-2 rounded hover:bg-gray-100 cursor-move"
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, item)}
          >
            <svelte:component this={item.icon} class="w-5 h-5 mr-2" />
            <span>{item.title}</span>
          </div>
        {/each}
      </ActivityGroup>
    {/each}
  </div>