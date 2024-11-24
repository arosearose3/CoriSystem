<script>
  import { onMount } from 'svelte';
  import { workflowStore } from '$lib/stores/workflow';
  import FlowNode from './FlowNode.svelte';
  import { selectedElementStore } from '$lib/stores/workflow';

  let canvasEl;
  let workflow;
  let isDragOver = false;
  let dragState = null;
  let nodeBeingDragged = null;
  let isDragging = false;

  $: workflow = $workflowStore;

  $: {
    console.log('Canvas: Workflow updated:', workflow);
    console.log('Canvas: Number of nodes:', workflow?.nodes?.length);
  }

  onMount(() => {
    initializeCanvas();
  });

  function handleCanvasClick(event) {
    if (event.target.classList.contains('canvas')) {
      selectedElementStore.set(null);
    }
  }

  function handleNodeDragStart(event) {
    const { nodeId } = event.detail;
    nodeBeingDragged = nodeId;
  }

  function initializeCanvas() {
    // Canvas initialization logic if needed
  }

  function handleDragOver(event) {
    if (!event.target.classList.contains('canvas')) return;
    
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    isDragOver = true;
  }

  function handleDragLeave(event) {
    if (!event.target.classList.contains('canvas')) return;
    
    event.preventDefault();
    isDragOver = false;
  }

  async function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    try {
      let data;
      try {
        const jsonData = event.dataTransfer.getData('application/json');
        data = JSON.parse(jsonData);
      } catch (err) {
        const textData = event.dataTransfer.getData('text/plain');
        data = JSON.parse(textData);
      }

      if (!data) {
        console.error('No valid data in drop event');
        return;
      }

      const rect = canvasEl.getBoundingClientRect();
      const scrollPos = {
        x: canvasEl.scrollLeft || 0,
        y: canvasEl.scrollTop || 0
      };
      
      const position = {
        x: Math.round(event.clientX - rect.left + scrollPos.x),
        y: Math.round(event.clientY - rect.top + scrollPos.y)
      };

      const newNode = {
        id: `node-${Date.now()}`,
        type: data.isEvent ? 'event' : 'activity',
        position,
        label: data.title,
        data: {
          ...data,
          type: data.type,
          title: data.title,
          properties: data.properties || {}
        },
        width: 200,
        height: 80,
        ports: {
          input: [{ id: 'input-1', type: 'input' }],
          output: [{ id: 'output-1', type: 'output' }]
        }
      };

      console.log('Canvas: Creating node:', newNode);
      await workflowStore.addNode(newNode);
      workflowStore.update();
      
    } catch (error) {
      console.error('Error in drop handler:', error);
    }
  }

  function handlePortDragStart(event) {
    const { nodeId, portType, portElement } = event.detail;
    const canvasRect = canvasEl.getBoundingClientRect();
    const portRect = portElement.getBoundingClientRect();
    
    dragState = {
      startX: portRect.left - canvasRect.left + (portRect.width / 2),
      startY: portRect.top - canvasRect.top + (portRect.height / 2),
      sourceNodeId: nodeId,
      portType: portType,
      currentX: portRect.left - canvasRect.left + (portRect.width / 2),
      currentY: portRect.top - canvasRect.top + (portRect.height / 2)
    };

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

  function handleNodeMove(event) {
    const { nodeId, position } = event.detail;
    workflowStore.updateNodePosition(nodeId, { ...position });
  }

  function handleNodeDragEnd(event) {
    const { nodeId } = event.detail;
    nodeBeingDragged = null;
    workflowStore.update();
  }

  function getEdgePositions(edge) {
    const sourceNode = workflow.nodes.find(n => n.id === edge.source);
    const targetNode = workflow.nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    return {
        x1: sourceNode.position.x + 120,
        y1: sourceNode.position.y + 40,
        x2: targetNode.position.x,
        y2: targetNode.position.y + 40
    };
  }
</script>

<div class="canvas-container" bind:this={canvasEl}>
  <div 
    class="canvas" 
    class:is-drag-over={isDragOver}
    on:dragover|preventDefault={handleDragOver}
    on:dragleave|preventDefault={handleDragLeave}
    on:drop|preventDefault={handleDrop}
    on:click={handleCanvasClick}
  >
    <svg class="connection-layer">
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

    <div class="node-layer">
      {#if workflow?.nodes?.length > 0}
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
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    overflow: auto;
    position: relative;
  }

  .canvas {
    width: 3000px;
    height: 2000px;
    position: relative;
    background: #f0f0f0;
    transition: all 0.2s ease;
  }

  .canvas.is-drag-over {
    background: #e8f4fd;
    border: 2px dashed #4A90E2;
  }

  .connection-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .node-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
  }

  .node-layer > :global(*) {
    pointer-events: auto;
  }

  .edge {
    pointer-events: none;
  }

  .drag-line {
    pointer-events: none;
  }
</style>