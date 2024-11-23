
// components/canvas/FlowNode.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import Webhook from 'lucide-svelte/icons/webhook';
  import Clock from 'lucide-svelte/icons/clock';
  import Database from 'lucide-svelte/icons/database';
  import Split from 'lucide-svelte/icons/split';
  import GitBranch from 'lucide-svelte/icons/git-branch';
  import List from 'lucide-svelte/icons/list';
  import Cog from 'lucide-svelte/icons/cog';
  import GripHorizontal from 'lucide-svelte/icons/grip-horizontal';
  import X from 'lucide-svelte/icons/x';
  
  const dispatch = createEventDispatcher();

  export let node;
  export let selected = false;
  export let position = { x: 0, y: 0 };

  let isDrawingConnection = false;
  let startPort = null;


  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  $: portConfig = getPortConfig(node.type);


  // Node type specific configurations
  const nodeConfigs = {
    webhook: {
      icon: Webhook,
      color: 'blue',
      label: 'Webhook Event'
    },
    timer: {
      icon: Clock,
      color: 'purple',
      label: 'Timer Event'
    },
    'fhir-change': {
      icon: Database,
      color: 'green',
      label: 'FHIR Change'
    },
    parallel: {
      icon: Split,
      color: 'orange',
      label: 'Parallel Execution'
    },
    condition: {
      icon: GitBranch,
      color: 'yellow',
      label: 'Condition'
    },
    sequence: {
      icon: List,
      color: 'gray',
      label: 'Sequence'
    },
    activity: {
      icon: Cog,
      color: 'indigo',
      label: 'Activity'
    }
  };

  $: config = nodeConfigs[node.type] || nodeConfigs.activity;

  function handlePortMouseDown(event, portType, portPosition) {
  event.stopPropagation();
  isDrawingConnection = true;
  startPort = { type: portType, position: portPosition, nodeId: node.id };
  dispatch('connectionstart', { 
    nodeId: node.id, 
    portType, 
    position: portPosition 
  });
}

function handlePortMouseUp(event, portType) {
  event.stopPropagation();
  if (isDrawingConnection) {
    dispatch('connectionend', {
      nodeId: node.id,
      portType
    });
    isDrawingConnection = false;
    startPort = null;
  }
}

  function handleDragStart(event) {
    isDragging = true;
    const rect = event.target.getBoundingClientRect();
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    dispatch('dragstart', { node, event });
  }

  function handleDrag(event) {
    if (!isDragging) return;
    
    const newPosition = {
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y
    };
    
    dispatch('move', {
      nodeId: node.id,
      position: newPosition
    });
  }

  function handleDragEnd() {
    isDragging = false;
    dispatch('dragend', { node });
  }

  function handleSelect() {
    dispatch('select', { node });
  }

  function handleDelete() {
    dispatch('delete', { nodeId: node.id });
  }
  
  function handleClick() {
    dispatch('select');
  }


  function getPortConfig(nodeType) {
  const eventTypes = ['webhook', 'timer', 'fhir-change'];
  return {
    hasInputPort: !eventTypes.includes(nodeType), // All non-events have input
    hasOutputPort: true  // All nodes can have outputs
  };
}

  function getPortPositions() {
    // Calculate port positions for node connections
    const width = 200; // Node width
    const height = 100; // Node height
    
    return {
      top: { x: position.x + width/2, y: position.y },
      right: { x: position.x + width, y: position.y + height/2 },
      bottom: { x: position.x + width/2, y: position.y + height },
      left: { x: position.x, y: position.y + height/2 }
    };
  }
</script>

<div
  class="absolute"
  style="top: {node.position.y}px; left: {node.position.x}px;"
  on:click={handleClick}
>
  <!-- Node rendering logic -->
  <div class="node">
    {node.data.title}
  </div>

  <div 
    class="relative rounded-lg shadow-lg p-4 w-[200px] cursor-move
           border-2 transition-all duration-200"
    class:border-{config.color}-500={selected}
    class:border-gray-200={!selected}
    class:bg-{config.color}-50={selected}
    class:bg-white={!selected}
  >
    <!-- Drag Handle -->
    <div 
      class="absolute top-0 left-0 right-0 h-6 flex items-center justify-center
             cursor-move hover:bg-gray-50 rounded-t-lg"
    >
      <GripHorizontal class="w-4 h-4 text-gray-400" />
    </div>

    <!-- Content -->
    <div class="pt-4">
      <div class="flex items-center mb-2">
        <svelte:component 
          this={config.icon} 
          class="w-5 h-5 mr-2 text-{config.color}-500"
        />
        <span class="font-medium">{node.label || config.label}</span>
      </div>

      <!-- Node specific content -->
      {#if node.type === 'webhook'}
        <div class="text-xs text-gray-500 truncate">
          {node.data?.url || 'Configure webhook URL'}
        </div>
      {:else if node.type === 'timer'}
        <div class="text-xs text-gray-500">
          {node.data?.schedule || 'Configure schedule'}
        </div>
      {:else if node.type === 'condition'}
        <div class="text-xs text-gray-500">
          {node.data?.expression || 'Configure condition'}
        </div>
      {/if}

      <!-- Action buttons -->
      <div class="absolute top-2 right-2 flex space-x-1">
        {#if node.type !== 'event'}
          <button
            class="p-1 hover:bg-gray-100 rounded"
            on:click|stopPropagation={handleDelete}
          >
            <X class="w-4 h-4 text-gray-400" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Connection ports -->
{#if portConfig.hasOutputPort}
  <div 
    class="absolute top-1/2 -right-2 w-4 h-4 bg-white border-2 
           border-gray-300 rounded-full transform -translate-y-1/2 
           cursor-crosshair port-right"
    on:mousedown={(e) => handlePortMouseDown(e, 'output', 'right')}
    on:mouseup={(e) => handlePortMouseUp(e, 'output')}
  />
{/if}

{#if portConfig.hasInputPort}
  <div 
    class="absolute top-1/2 -left-2 w-4 h-4 bg-white border-2 
           border-gray-300 rounded-full transform -translate-y-1/2 
           cursor-crosshair port-left"
    on:mousedown={(e) => handlePortMouseDown(e, 'input', 'left')}
    on:mouseup={(e) => handlePortMouseUp(e, 'input')}
  />
{/if}
  </div>
</div>

<style>


  .port-left, .port-right {
    transition: all 0.2s ease;
  }

  .port-left:hover, .port-right:hover {
    border-color: theme('colors.blue.500');
    transform: translate(-50%, -50%) scale(1.2);
  }

  .port-left.active, .port-right.active {
    border-color: theme('colors.blue.500');
    background-color: theme('colors.blue.100');
  }


  .selected {
    z-index: 10;
  }

  .port-left:hover, .port-right:hover {
    border-color: theme('colors.blue.500');
  }

  /* Add animation for dragging */
  .dragging {
    opacity: 0.8;
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }
</style>


