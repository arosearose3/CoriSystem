// ActivityPalette.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import ActivityGroup from './ActivityGroup.svelte';

  const dispatch = createEventDispatcher();

  const categories = [
    {
      name: 'Events',
      description: 'Workflow triggers',
      items: [
        { type: 'webhook', title: 'Webhook Event' },
        { type: 'fhir-change', title: 'FHIR Change' },
        { type: 'timer', title: 'Timer Event' }
      ]
    },
    {
      name: 'Forms & Assessment',
      description: 'Data collection activities',
      items: [
        { type: 'send-questionnaire', title: 'Send Questionnaire' },
        { type: 'process-response', title: 'Process Response' }
      ]
    },
    {
      name: 'Communication',
      description: 'Messaging and notifications',
      items: [
        { type: 'send-notification', title: 'Send Notification' },
        { type: 'record-consent', title: 'Record Consent' }
      ]
    },
    {
      name: 'Clinical',
      description: 'Clinical workflow activities',
      items: [
        { type: 'create-referral', title: 'Create Referral' },
        { type: 'record-health-concern', title: 'Record Health Concern' },
        { type: 'create-goal', title: 'Create Goal' }
      ]
    },
    {
      name: 'Service Delivery',
      description: 'Service management activities',
      items: [
        { type: 'schedule-service', title: 'Schedule Service' },
        { type: 'record-service', title: 'Record Service Delivery' },
        { type: 'verify-eligibility', title: 'Verify Eligibility' }
      ]
    },
    {
      name: 'Resource Management',
      description: 'Task and resource operations',
      items: [
        { type: 'assign-task', title: 'Assign Task' },
        { type: 'update-task-status', title: 'Update Task Status' }
      ]
    },
    {
      name: 'Integration',
      description: 'System integration activities',
      items: [
        { type: 'synchronize-resource', title: 'Synchronize Resource' },
        { type: 'check-benefits', title: 'Check Benefits' }
      ]
    },
    {
      name: 'Flow Control',
      description: 'Workflow control structures',
      items: [
        { type: 'parallel', title: 'Parallel Tasks' },
        { type: 'sequence', title: 'Sequence' },
        { type: 'condition', title: 'Condition' }
      ]
    }
  ];

  function handleDragStart(event, item) {
  if (item) {
    const data = JSON.stringify(item);
    console.log('Drag start data:', data);
  //  event.dataTransfer.setData('application/json', data);
    event.dataTransfer.setData('text/plain', data);  // Add this as fallback
    dispatch('dragstart', { item });
  }
}
</script>

<div class="h-full bg-gray-50 p-4 overflow-y-auto">
  <h2 class="text-lg font-semibold mb-4">Activities</h2>

  {#each categories as category (category.name)}
    <ActivityGroup
      name={category.name}
      description={category.description}
    >
      {#each category.items as item (item.type)}
        <div
          class="flex items-center p-2 rounded hover:bg-gray-100 cursor-move"
          draggable="true"
          on:dragstart|stopPropagation={(e) => handleDragStart(e, item)}
        >
          <span>{item.title}</span>
        </div>
      {/each}
    </ActivityGroup>
  {/each}
</div>