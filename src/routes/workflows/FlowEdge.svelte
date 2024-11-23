// components/canvas/FlowEdge.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import Draw from 'lucide-svelte/icons/pen';
  import Trash2 from 'lucide-svelte/icons/trash-2';

  const dispatch = createEventDispatcher();

  export let edge;
  export let sourceNode;
  export let targetNode;
  export let selected = false;

  $: path = calculatePath(sourceNode.position, targetNode.position);
  $: midPoint = calculateMidPoint(path);

  function calculatePath(source, target) {
    const sourceX = source.x + 200; // Node width
    const sourceY = source.y + 50;  // Node height/2
    const targetX = target.x;
    const targetY = target.y + 50;
    
    const controlPoint1X = sourceX + Math.min(100, (targetX - sourceX) / 2);
    const controlPoint2X = targetX - Math.min(100, (targetX - sourceX) / 2);

    return `M ${sourceX} ${sourceY} 
            C ${controlPoint1X} ${sourceY} 
              ${controlPoint2X} ${targetY} 
              ${targetX} ${targetY}`;
  }

  function calculateMidPoint(path) {
    // Calculate middle point of the curve for label placement
    const pathLength = path.getTotalLength();
    const point = path.getPointAtLength(pathLength / 2);
    return { x: point.x, y: point.y };
  }

  function handleDelete() {
    dispatch('delete', { edgeId: edge.id });
  }
</script>

<g class="flow-edge" class:selected>
  <!-- Edge Path -->
  <path
    d={path}
    class="stroke-2 fill-none transition-colors duration-200"
    class:stroke-gray-300={!selected}
    class:stroke-blue-500={selected}
  />

  <!-- Edge Arrow -->
  <marker
    id="arrow"
    viewBox="0 0 10 10"
    refX="5"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto-start-reverse"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" class="fill-current" />
  </marker>

  <!-- Edge Label -->
  {#if edge.label}
    <g transform="translate({midPoint.x},{midPoint.y})">
      <rect
        x="-40"
        y="-10"
        width="80"
        height="20"
        rx="4"
        class="fill-white stroke-gray-200"
      />
      <text
        class="text-xs text-center"
        dy=".3em"
      >
        {edge.label}
      </text>
    </g>
  {/if}

  <!-- Edge Controls -->
  {#if selected}
    <g transform="translate({midPoint.x},{midPoint.y - 30})">
      <rect
        x="-20"
        y="-15"
        width="40"
        height="30"
        rx="4"
        class="fill-white shadow-lg"
      />
      <g transform="translate(0,0)">
        <button
          class="p-1 hover:bg-gray-100 rounded"
          on:click={handleDelete}
        >
          <Trash2 class="w-4 h-4 text-red-500" />
        </button>
      </g>
    </g>
  {/if}
</g>