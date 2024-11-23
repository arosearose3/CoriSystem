<!-- FlowNode.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import Database from 'lucide-svelte/icons/database';
  import Cog from 'lucide-svelte/icons/cog';
  import X from 'lucide-svelte/icons/x';
  
  const dispatch = createEventDispatcher();
  export let node;

  // Determine if node should have input/output ports
  $: hasOutputPort = ['timer', 'webhook', 'fhir-change'].includes(node.type);
  $: hasInputPort = !hasOutputPort; // activities have input ports

  function handleConnectionStart(event, portType) {
    event.stopPropagation();
    console.log('Connection start:', portType, node.id);
    dispatch('connectionstart', {
      nodeId: node.id,
      portType,
      position: {
        x: event.clientX,
        y: event.clientY
      }
    });
  }
</script>

<div
  class="absolute bg-white rounded-lg shadow-md p-4 w-48 border border-gray-200"
  style="left: {node.position.x}px; top: {node.position.y}px;"
>
  <!-- Main content -->
  <div class="flex items-center justify-between">
    <div class="flex items-center">
      {#if node.type === 'fhir-change'}
        <Database class="w-5 h-5 mr-2" />
      {:else}
        <Cog class="w-5 h-5 mr-2" />
      {/if}
      <span class="font-medium">{node.data?.title || node.type}</span>
    </div>
    <button 
      class="text-gray-400 hover:text-gray-600"
      on:click={() => dispatch('delete')}
    >
      <X class="w-4 h-4" />
    </button>
  </div>

  <!-- Output Port (for event nodes) -->
  {#if hasOutputPort}
    <div 
      class="absolute -right-3 top-1/2 w-6 h-6 bg-blue-500 rounded-full 
             transform -translate-y-1/2 cursor-crosshair hover:bg-blue-600
             border-2 border-white"
      on:mousedown={(e) => handleConnectionStart(e, 'output')}
      style="z-index: 10;"
      title="Output Port"
    />
  {/if}

  <!-- Input Port (for activity nodes) -->
  {#if hasInputPort}
    <div 
      class="absolute -left-3 top-1/2 w-6 h-6 bg-green-500 rounded-full 
             transform -translate-y-1/2 cursor-crosshair hover:bg-green-600
             border-2 border-white"
      on:mousedown={(e) => handleConnectionStart(e, 'input')}
      style="z-index: 10;"
      title="Input Port"
    />
  {/if}
</div>

<style>
  /* Add a subtle glow effect to ports on hover */
  div[class*="rounded-full"]:hover {
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }
</style>