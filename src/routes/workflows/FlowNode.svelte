<script>
    import { createEventDispatcher, onDestroy } from 'svelte';
    
    export let node;
    const dispatch = createEventDispatcher();
  
    let nodeEl;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let position = {
      x: node.position.x,
      y: node.position.y
    };
  
    $: {
    if (!isDragging && node.position) {
        // Only update from props if we're not the ones who just finished dragging
        if (position.x !== node.position.x || position.y !== node.position.y) {
            position = {
                x: node.position.x,
                y: node.position.y
            };
        }
    }
}

  function handleNodeMouseDown(event) {
    if (event.target.classList.contains('port')) {
        return;
    }

    event.stopPropagation();
    isDragging = true;
    
    // Calculate offset from node's current position
    dragStart = {
        x: event.clientX - position.x,
        y: event.clientY - position.y
    };

    dispatch('dragstart', { nodeId: node.id });
    
    // Add handlers to window
    window.addEventListener('mousemove', handleNodeMouseMove);
    window.addEventListener('mouseup', handleNodeMouseUp);
}

  function handlePortMouseDown(event, portType) {
    event.stopPropagation(); // Prevent node drag
    event.preventDefault();

    dispatch('portdragstart', {
      nodeId: node.id,
      portType,
      portElement: event.target
    });
  }

  
  function handleNodeMouseMove(event) {
    if (!isDragging) return;

    // Calculate new position relative to drag start
    position = {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
    };
    
    // Update store with new position
    dispatch('nodemove', {
        nodeId: node.id,
        position
    });
}
  
function handleNodeMouseUp() {
    if (!isDragging) return;
    
    const finalPosition = { ...position }; // Save final position
    cleanupDrag();
    
    // Update store with final position
    dispatch('nodemove', {
        nodeId: node.id,
        position: finalPosition
    });
    
    dispatch('dragend', { nodeId: node.id });
}

function cleanupDrag() {
    window.removeEventListener('mousemove', handleNodeMouseMove);
    window.removeEventListener('mouseup', handleNodeMouseUp);
    isDragging = false;
}

// NEW: Add back onDestroy cleanup
onDestroy(() => {
    cleanupDrag();
});
  </script>
  
  <div
    bind:this={nodeEl}
    class="node"
    style="transform: translate({position.x}px, {position.y}px);"
    on:mousedown={handleNodeMouseDown}
  >
    <div class="node-content">
      <h4 class="node-title">{node.label}</h4>
    </div>
  
    <div 
    class="port port-input"
    data-node-id={node.id}
    data-port-type="input"
    on:mousedown={(e) => handlePortMouseDown(e, 'input')}
  >
      Input
    </div>
  
    <div 
    class="port port-output"
    data-node-id={node.id}
    data-port-type="output"
    on:mousedown={(e) => handlePortMouseDown(e, 'output')}
  >
      Output
    </div>
  </div>
  
  <style>
    .node {
      position: absolute;
      width: 120px;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      cursor: move;
      user-select: none;
    }
  
    .node-title {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin: 0 0 8px 0;
    }
  
    .port {
    width: 12px;
    height: 12px;
    background-color: #4A90E2;
    border-radius: 50%;
    position: absolute;
    cursor: crosshair; /* Changed to crosshair for better UX */
  }

  .port-input {
    top: 50%;
    left: -6px;
    transform: translateY(-50%);
  }

  .port-output {
    top: 50%;
    right: -6px;
    transform: translateY(-50%);
  }
  
    .port:hover {
      background-color: #357ABD;
    }
  </style>