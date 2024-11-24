<script>
  import { onMount } from 'svelte';
  import { workflowStore } from '$lib/stores/workflow';
  import FlowNode from './FlowNode.svelte';

  let canvasEl;
  let workflow;
  let isDragOver = false;
  let dragState = null;
  let nodeBeingDragged = null; // Track which node is being dragged


  $: workflow = $workflowStore;
  //$: console.log('Workflow updated:', workflow); // Debug workflow updates

  onMount(() => {
    initializeCanvas();
  });

  function handleNodeDragStart(event) {
    const { nodeId } = event.detail;
    nodeBeingDragged = nodeId;
  }

  function initializeCanvas() {
    // Any canvas initialization logic
  }

  // Drag and drop handlers for new nodes
  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    // If the drop target is inside a container node, skip canvas handling
    if (event.target.closest('.container-zone')) {
      return;
    }
    
    try {
      const dataStr = event.dataTransfer.getData('application/json') || 
                     event.dataTransfer.getData('text/plain');
      const data = JSON.parse(dataStr);
      const rect = canvasEl.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      
      const newNode = {
        id: `node-${Date.now()}`,
        type: data.type,
        position,
        label: data.title,
        data: {
          ...data,
          title: data.title
        }
      };
      
      workflowStore.addNode(newNode);
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  }

  // Connection drag handlers
  function handlePortDragStart(event) {
    const { nodeId, portType, portElement } = event.detail;
    const canvasRect = canvasEl.getBoundingClientRect();
    const portRect = portElement.getBoundingClientRect();
    
    // Calculate initial position
    dragState = {
      startX: portRect.left - canvasRect.left + (portRect.width / 2),
      startY: portRect.top - canvasRect.top + (portRect.height / 2),
      sourceNodeId: nodeId,
      portType: portType,
      currentX: portRect.left - canvasRect.left + (portRect.width / 2),
      currentY: portRect.top - canvasRect.top + (portRect.height / 2)
    };

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event) {
    if (!dragState) return;

    const canvasRect = canvasEl.getBoundingClientRect();
    dragState = {
      ...dragState,
      currentX: event.clientX - canvasRect.left,
      currentY: event.clientY - canvasRect.top
    };
  }

  function handleMouseUp(event) {
    if (!dragState) return;

    const targetPort = findPortAtPosition(event.clientX, event.clientY);
    
    if (targetPort && isValidConnection(dragState.portType, targetPort.dataset.portType)) {
      const edge = {
        id: `edge-${Date.now()}`,
        source: dragState.sourceNodeId,
        target: targetPort.dataset.nodeId
      };
      workflowStore.addEdge(edge);
    }

    // Important: Clean up
    cleanupDrag();
  }

  function cleanupDrag() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    dragState = null;
  }

  function findPortAtPosition(x, y) {
    const ports = canvasEl.querySelectorAll('.port');
    for (const port of ports) {
      const rect = port.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && 
          y >= rect.top && y <= rect.bottom) {
        return port;
      }
    }
    return null;
  }

  function isValidConnection(sourceType, targetType) {
    return sourceType === 'output' && targetType === 'input';
  }

  // Node movement handlers
  function handleNodeMove(event) {
    const { nodeId, position } = event.detail;
    // Ensure we're passing a new position object
    workflowStore.updateNodePosition(nodeId, { ...position });
  }

  function handleNodeDragEnd(event) {
    const { nodeId } = event.detail;
    nodeBeingDragged = null;
    // Force edge recalculation
    workflowStore.update();
  }

  function getEdgePositions(edge) {
    const sourceNode = workflow.nodes.find(n => n.id === edge.source);
    const targetNode = workflow.nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    // Use the actual node positions from the store
    return {
        x1: sourceNode.position.x + 120, // Node width for output port
        y1: sourceNode.position.y + 40,  // Half node height
        x2: targetNode.position.x,       // Input port is on left
        y2: targetNode.position.y + 40   // Half node height
    };
}

</script>

<div 
  class="canvas-wrapper"
  class:is-drag-over={isDragOver}
  bind:this={canvasEl}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <!-- Connection layer (SVG) -->
  <svg class="connection-layer">
    <!-- Permanent connections -->
    {#if workflow?.edges && !nodeBeingDragged}
      {#each workflow.edges as edge (edge.id)}
        {@const positions = getEdgePositions(edge)}
        {#if positions}
          <line 
            class="edge"
            x1={positions.x1}
            y1={positions.y1}
            x2={positions.x2}
            y2={positions.y2}
            stroke="#666"
            stroke-width="2"
          />
        {/if}
      {/each}
    {/if}

    <!-- Active drag connection -->
    {#if dragState}
      <line
        class="drag-line"
        x1={dragState.startX}
        y1={dragState.startY}
        x2={dragState.currentX}
        y2={dragState.currentY}
        stroke="#4A90E2"
        stroke-width="2"
        stroke-dasharray="4"
      />
    {/if}
  </svg>

  <!-- Node layer -->
  <div class="node-layer">
    {#if workflow?.nodes}
      {#each workflow.nodes as node (node.id)}
      <FlowNode 
        {node}
        on:portdragstart={handlePortDragStart}
        on:nodemove={handleNodeMove}
        on:dragstart={handleNodeDragStart}
        on:dragend={handleNodeDragEnd}
      />
      {/each}
    {/if}
  </div>
</div>

<style>
  .canvas-wrapper {
    position: relative;
    width: 800px;
    height: 600px;
    background: #f0f0f0;
    border: 1px solid #ccc;
    overflow: hidden;
  }

  .is-drag-over {
    border: 2px dashed #4A90E2;
    background-color: #F0F8FF;
  }

  .connection-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
  }

  .node-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 50;
  }

  .edge {
    pointer-events: none;
  }

  .drag-line {
    pointer-events: none;
  }
</style>