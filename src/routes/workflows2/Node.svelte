
<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import X  from 'lucide-svelte/icons/x';
 
    import { workflowStore } from './workflowstore.js';
  
    export let node;
    export let selected = false;
  
    const dispatch = createEventDispatcher();
    
    let nodeEl;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let position = {
      x: node?.position?.x || 0,
      y: node?.position?.y || 0
    };
  
    const isContainer = node.type === 'container';
    
    $: {
      if (!isDragging && node?.position) {
        position = { ...node.position };
      }
    }
  
    function handleMouseDown(event) {
      // Ignore if clicking on port or other interactive elements
      if (event.target.closest('.port') || 
          event.target.closest('.remove-btn') ||
          event.target.closest('.property')) {
        return;
      }
  
      event.stopPropagation();
      
      isDragging = false;
      dragStart = {
        x: event.clientX - position.x,
        y: event.clientY - position.y
      };
  
      // Select after a brief delay if not dragging
      setTimeout(() => {
        if (!isDragging) {
          workflowStore.setSelectedNode(node.id);
        }
      }, 150);
  
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  
    function handleMouseMove(event) {
      isDragging = true;
      
      const newPosition = {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      };
  
      position = newPosition;
      dispatch('move', { nodeId: node.id, position: newPosition });
    }
  
    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      if (isDragging) {
        dispatch('dragend', { nodeId: node.id });
        isDragging = false;
      }
    }
  
    function handlePortMouseDown(event, portType) {
    event.stopPropagation();
    
    const portEl = event.target;
    const rect = portEl.getBoundingClientRect();
    const canvasRect = portEl.closest('.canvas-container').getBoundingClientRect();

    // Calculate position relative to canvas
    const position = {
      x: rect.left - canvasRect.left + (rect.width / 2),
      y: rect.top - canvasRect.top + (rect.height / 2)
    };

    dispatch('connectionStart', {
      nodeId: node.id,
      portType,
      portId: `${node.id}-${portType}`,
      position
    });
  }
  
    function handleRemoveNode() {
      workflowStore.removeNode(node.id);
    }
  
    function handleContainerDragOver(event) {
      if (!isContainer) return;
      event.preventDefault();
      event.stopPropagation();
      event.target.classList.add('drag-over');
    }
  
    function handleContainerDragLeave(event) {
      if (!isContainer) return;
      event.preventDefault();
      event.stopPropagation();
      event.target.classList.remove('drag-over');
    }
  
    function handleContainerDrop(event) {
      if (!isContainer) return;
      event.preventDefault();
      event.stopPropagation();
      event.target.classList.remove('drag-over');
  
      try {
        const data = JSON.parse(event.dataTransfer.getData('application/json'));
        
        // Prevent container-in-container
        if (data.type === 'container') {
          console.warn('Cannot nest containers');
          return;
        }
  
        const childNode = {
          id: `child-${Date.now()}`,
          type: data.type,
          parentId: node.id,
          data: { ...data }
        };
  
        workflowStore.update(state => {
          const updatedNode = {
            ...node,
            children: [...(node.children || []), childNode]
          };
          return {
            ...state,
            nodes: state.nodes.map(n => n.id === node.id ? updatedNode : n)
          };
        });
      } catch (error) {
        console.error('Error handling container drop:', error);
      }
    }
  </script>
  
  <div
    bind:this={nodeEl}
    class="node {node.type}"
    class:selected
    class:is-container={isContainer}
    style="
      left: {position.x}px;
      top: {position.y}px;
      width: {node.data.width}px;
      min-height: {node.data.height}px;
    "
    on:mousedown={handleMouseDown}
  >
    <!-- Remove Button -->
    <button 
      class="remove-btn"
      on:click|stopPropagation={handleRemoveNode}
      aria-label="Remove node"
    >
      <X size={16} />
    </button>
  
    <!-- Node Content -->
    <div class="node-content">
      <h3 class="node-title">
        {node.data.title}
      </h3>
  
      <!-- Container Drop Zone -->
      {#if isContainer}
        <div
          class="container-zone"
          class:drag-over={false}
          on:dragover={handleContainerDragOver}
          on:dragleave={handleContainerDragLeave}
          on:drop={handleContainerDrop}
        >
          {#if node.children?.length}
            {#each node.children as child (child.id)}
              <div class="container-child" transition:fade>
                <span>{child.data.title}</span>
                <button
                  class="remove-child"
                  on:click|stopPropagation={() => {
                    workflowStore.update(state => ({
                      ...state,
                      nodes: state.nodes.map(n => 
                        n.id === node.id 
                          ? { ...n, children: n.children.filter(c => c.id !== child.id) }
                          : n
                      )
                    }));
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            {/each}
          {:else}
            <div class="drop-placeholder">
              Drop items here
            </div>
          {/if}
        </div>
      {/if}
  
      <!-- Properties Section -->
      <div class="properties">
        <slot name="properties" />
      </div>
    </div>
  
    <!-- Connection Ports -->
    <div
    class="port port-input"
    data-node-id={node.id}
    data-port-id="{node.id}-input"
    data-port-type="input"
    on:mousedown={(e) => handlePortMouseDown(e, 'input')}
  />
  
  <div
    class="port port-output"
    data-node-id={node.id}
    data-port-id="{node.id}-output"
    data-port-type="output"
    on:mousedown={(e) => handlePortMouseDown(e, 'output')}
  />
  </div>  
  
  <style>
    .node {
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      user-select: none;
      cursor: move;
      transition: box-shadow 0.2s;
    }
  
    .node.selected {
      box-shadow: 0 0 0 2px #3b82f6;
    }
  
    .node.is-container {
      min-width: 300px;
      min-height: 200px;
    }
  
    .node-content {
      position: relative;
      z-index: 1;
    }
  
    .node-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 8px 0;
      padding-right: 24px;
    }
  
    .port {
    width: 12px;
    height: 12px;
    background-color: #4A90E2;
    border: 2px solid white;
    border-radius: 50%;
    position: absolute;
    cursor: crosshair;
    z-index: 2;
    transition: all 0.2s;
  }

  .port:hover {
    transform: scale(1.2);
    background-color: #357ABD;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
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
  
    .remove-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      padding: 2px;
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      border-radius: 4px;
      z-index: 2;
    }
  
    .remove-btn:hover {
      background: #fee2e2;
      color: #ef4444;
    }
  
    .container-zone {
      margin: 8px -4px;
      padding: 8px;
      border: 2px dashed #ccc;
      border-radius: 4px;
      min-height: 100px;
      background: rgba(255, 255, 255, 0.8);
      transition: all 0.2s;
    }
  
    .container-zone.drag-over {
      background: rgba(59, 130, 246, 0.1);
      border-color: #3b82f6;
    }
  
    .container-child {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      margin: 4px 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-size: 13px;
    }
  
    .remove-child {
      padding: 2px;
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      border-radius: 4px;
    }
  
    .remove-child:hover {
      background: #fee2e2;
      color: #ef4444;
    }
  
    .drop-placeholder {
      color: #94a3b8;
      text-align: center;
      padding: 8px;
      font-style: italic;
    }
  
    .properties {
      margin-top: 8px;
    }
  
    /* Node type-specific styles */
    .node.event {
      border-color: #48bb78;
    }
  
    .node.task {
      border-color: #4299e1;
    }
  
    .node.container {
      border-color: #6366f1;
    }
  </style>