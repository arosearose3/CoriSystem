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
  

    let isContainer = node.type === 'parallel' || node.type === 'sequence';
    let dropTarget = null;


/*     $: {
    if (!isDragging) {
      position = {
        x: node.position.x,
        y: node.position.y
      };
    }
  } */

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

function handleContainerDragOver(event) {
    if (!isContainer) return;
    event.preventDefault();
    dropTarget = event.target;
    event.dataTransfer.dropEffect = 'copy';
  }

  async function handleContainerDrop(event) {
    if (!isContainer) return;
    event.preventDefault();
    event.stopPropagation(); // Stop event from bubbling to canvas
    dropTarget = null;

    try {
      const data = JSON.parse(
        event.dataTransfer.getData('application/json') ||
        event.dataTransfer.getData('text/plain')
      );

      // Only accept activity types
      if (data.type !== 'activity') return;

      // Create child activity without position (containers manage layout)
      const child = {
        id: `activity-${Date.now()}`,
        type: 'activity',
        label: data.title,
        parentId: node.id,
        data: {
          ...data,
          title: data.title
        }
      };

      dispatch('addchild', {
        parentId: node.id,
        child
      });
    } catch (err) {
      console.error('Error handling container drop:', err);
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
  class:is-container={isContainer}
  style="transform: translate({position.x}px, {position.y}px);"
  on:mousedown={handleNodeMouseDown}
>
    <div class="node-content">
      <h4 class="node-title">{node.label}</h4>
       <!-- Container drop zone -->
       {#if isContainer}
       <div 
       class="container-zone"
       class:is-parallel={node.type === 'parallel'}
       class:is-sequence={node.type === 'sequence'}
       on:dragover|stopPropagation={handleContainerDragOver}
       on:dragleave|stopPropagation={() => dropTarget = null}
       on:drop|stopPropagation={handleContainerDrop}
     >
         {#if node.children?.length}
           {#each node.children as child}
             <div class="container-child">
               <span>{child.label}</span>
               <button 
                 class="remove-child"
                 on:click={() => dispatch('removechild', { 
                   parentId: node.id, 
                   childId: child.id 
                 })}
               >×</button>
             </div>
           {/each}
         {:else}
           <div class="drop-placeholder">
             Drop Activities Here
           </div>
         {/if}
       </div>
     {/if}
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
    .container-zone {
    margin: 1rem;
    padding: 1rem;
    border: 2px dashed #ccc;
    border-radius: 4px;
    min-height: 100px;
    background: rgba(255, 255, 255, 0.9); /* Make drop zone stand out */
  }

  .container-child {
    padding: 0.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.25rem 0;
  }

  /* Add visual feedback for drag over */
  .container-zone.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
  }
  
  </style>