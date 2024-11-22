// routes/workflows/active/+page.svelte
<script>
  import { onMount } from 'svelte';
  import { Activity, AlertCircle } from 'lucide-svelte';

  let activeWorkflows = [];
  let selectedWorkflow = null;

  onMount(async () => {
    activeWorkflows = await fetchActiveWorkflows();
  });

  function getStatusColor(status) {
    const colors = {
      running: 'green',
      paused: 'yellow',
      error: 'red'
    };
    return colors[status] || 'gray';
  }
</script>

<div class="p-4">
  <div class="grid grid-cols-2 gap-4">
    <div class="bg-white shadow rounded p-4">
      <h2 class="text-lg font-semibold mb-4">Active Workflows</h2>
      <div class="space-y-2">
        {#each activeWorkflows as workflow}
          <div 
            class="p-3 border rounded hover:bg-gray-50 cursor-pointer"
            class:bg-blue-50={selectedWorkflow?.id === workflow.id}
            on:click={() => selectedWorkflow = workflow}
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">{workflow.name}</h3>
                <p class="text-sm text-gray-500">Started: {workflow.startTime}</p>
              </div>
              <div class={`text-${getStatusColor(workflow.status)}-500 flex items-center`}>
                <Activity class="w-4 h-4 mr-1" />
                {workflow.status}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="bg-white shadow rounded p-4">
      {#if selectedWorkflow}
        <h2 class="text-lg font-semibold mb-4">Workflow Details</h2>
        <!-- Workflow details and controls -->
      {:else}
        <p class="text-gray-500">Select a workflow to view details</p>
      {/if}
    </div>
  </div>
</div>