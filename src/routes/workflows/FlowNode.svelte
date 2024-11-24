<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import X from 'lucide-svelte/icons/x';
  import { selectedElementStore } from '$lib/stores/workflow';
  import { fade, fly } from 'svelte/transition';

  export let node;
  export let apiProperties = [];
  export let selected = false;

  const dispatch = createEventDispatcher();
  let assignedProperties = new Map();
  let nodeEl;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dropTarget = null;
  let isContainer = node.type === 'parallel' || node.type === 'sequence';
  
  let position = {
    x: node?.position?.x || 0,
    y: node?.position?.y || 0
  };

  let width = node?.width || (isContainer ? 300 : 200);
  let height = node?.height || (isContainer ? 200 : 80);

  $: {
    if (!isDragging && node?.position) {
      position = {
        x: node.position.x,
        y: node.position.y
      };
    }
  }

  function handleNodeClick(event) {
    if (!isDragging) {
      event.stopPropagation();
      selectedElementStore.set({
        id: node.id,
        type: node.type,
        properties: node.properties,
        data: node.data
      });
    }
  }

  function handleContainerDragOver(event) {
    if (!isContainer) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.add('drag-over');
    dispatch('containerdragover', event);
  }

  function handleContainerDragLeave(event) {
    if (!isContainer) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.remove('drag-over');
  }

  async function handleContainerDrop(event) {
    if (!isContainer) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.remove('drag-over');

    try {
      let data;
      try {
        const jsonData = event.dataTransfer.getData('application/json');
        data = JSON.parse(jsonData);
      } catch (err) {
        const textData = event.dataTransfer.getData('text/plain');
        data = JSON.parse(textData);
      }

      // Prevent container-in-container
      if (data.isContainer || data.type === 'parallel' || data.type === 'sequence') {
        console.error('Cannot drop containers into containers');
        return;
      }

      const child = {
        id: `activity-${Date.now()}`,
        type: data.type,
        label: data.title,
        parentId: node.id,
        data: {
          ...data,
          title: data.title,
          properties: data.properties || {}
        }
      };

      console.log('Adding child to container:', child);
      dispatch('addchild', {
        parentId: node.id,
        child: child
      });
    } catch (err) {
      console.error('Error handling container drop:', err);
    }
  }

  function handleNodeMouseDown(event) {
    if (event.target.closest('.property-chip') || 
        event.target.closest('.property-slot') ||
        event.target.closest('.port') ||
        event.target.closest('.remove-child') ||
        event.target.closest('.remove-node-btn')) {
      return;
    }

    event.stopPropagation();
    isDragging = false;
    dragStart = {
      x: event.clientX - position.x,
      y: event.clientY - position.y
    };

    setTimeout(() => {
      if (!isDragging) {
        handleNodeClick(event);
      }
    }, 150);

    window.addEventListener('mousemove', handleNodeMouseMove);
    window.addEventListener('mouseup', handleNodeMouseUp);
  }

  function handlePortMouseDown(event, portType) {
    event.stopPropagation();
    event.preventDefault();
    
    if (event.target.closest('.property-chip') || 
        event.target.closest('.property-slot')) {
      return;
    }

    dispatch('portdragstart', {
      nodeId: node.id,
      portType,
      portElement: event.target
    });
  }

  function handlePropertyDragOver(event) {
    if (!event.dataTransfer.types.includes('application/json')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    if (isValidPropertyType(event)) {
      event.currentTarget.classList.add('valid-target');
      event.dataTransfer.dropEffect = 'copy';
    } else {
      event.currentTarget.classList.add('invalid-target');
      event.dataTransfer.dropEffect = 'none';
    }
  }

  function handlePropertyDrop(event) {
    if (!event.dataTransfer.types.includes('application/json')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const property = JSON.parse(event.dataTransfer.getData('application/json'));
      dispatch('propertyAssigned', {
        nodeId: node.id,
        property
      });
    } catch (err) {
      console.error('Error handling property drop:', err);
    }
  }

  function handleNodeMouseMove(event) {
    isDragging = true;
    position = {
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    };
    
    dispatch('nodemove', {
      nodeId: node.id,
      position
    });
  }

  function handleNodeMouseUp() {
    if (!isDragging) return;
    
    const finalPosition = { ...position };
    cleanupDrag();
    
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

  function handleRemoveChild(childId) {
    dispatch('removechild', { 
      parentId: node.id, 
      childId: childId 
    });
  }

  function handleRemoveNode() {
    dispatch('removenode', { 
      nodeId: node.id 
    });
  }

  // Cleanup on component destroy
  onDestroy(() => {
    cleanupDrag();
  });

  function isValidPropertyType(event) {
    // Add your property validation logic here
    return true;
  }
</script>
<div
  bind:this={nodeEl}
  class="node {node.type} {isContainer ? 'is-container' : ''}"
  class:selected={$selectedElementStore?.id === node.id}
  style="position: absolute; left: {position.x}px; top: {position.y}px; width: {width}px; min-height: {height}px;"
  on:mousedown={handleNodeMouseDown}
>
  <button 
    class="remove-node-btn"
    on:click|stopPropagation={handleRemoveNode}
    aria-label="Remove node"
  >
    <X size={14} />
  </button>

  <div class="node-content">
    <h4 class="node-title">{node.label}</h4>
    
    {#if isContainer}
      <div 
        class="container-zone"
        class:is-parallel={node.type === 'parallel'}
        class:is-sequence={node.type === 'sequence'}
        class:drag-over={dropTarget === 'container'}
        on:dragover|stopPropagation={handleContainerDragOver}
        on:dragleave|stopPropagation={handleContainerDragLeave}
        on:drop|stopPropagation={handleContainerDrop}
      >
        {#if node.children?.length}
          {#each node.children as child}
            <div class="container-child" transition:fade>
              <span>{child.label}</span>
              <button 
                class="remove-child"
                on:click|stopPropagation={() => handleRemoveChild(child.id)}
                aria-label="Remove activity"
              >
                <X size={14} />
              </button>
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
    class="property-slots"
    on:dragover={handlePropertyDragOver}
    on:drop={handlePropertyDrop}
  >
    <slot name="properties"></slot>
  </div>

  <div 
    class="port port-input"
    data-node-id={node.id}
    data-port-type="input"
    on:mousedown={(e) => handlePortMouseDown(e, 'input')}
  />

  <div 
    class="port port-output"
    data-node-id={node.id}
    data-port-type="output"
    on:mousedown={(e) => handlePortMouseDown(e, 'output')}
  />
</div>

<style>
  .node {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    cursor: move;
    user-select: none;
    z-index: 100;
  }
  
  .node.activity {
    border-color: #4299e1;
  }

  .node.event {
    border-color: #48bb78;
  }

  .node.parallel {
    border-color: #6366f1;
  }

  .node.sequence {
    border-color: #8b5cf6;
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
    font-weight: bold;
    text-align: center;
    margin: 0 0 8px 0;
    padding-right: 20px;
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
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
  }

  .container-zone {
    margin: 1rem;
    padding: 1rem;
    border: 2px dashed #ccc;
    border-radius: 4px;
    min-height: 100px;
    background: rgba(255, 255, 255, 0.9);
    transition: all 0.2s ease;
  }

  .container-zone.is-parallel {
    background: rgba(99, 102, 241, 0.05);
    border-color: #6366f1;
  }

  .container-zone.is-sequence {
    background: rgba(139, 92, 246, 0.05);
    border-color: #8b5cf6;
  }

  .container-zone.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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
    gap: 0.5rem;
  }

  .drop-placeholder {
    color: #94a3b8;
    text-align: center;
    padding: 1rem;
    font-style: italic;
  }

  .property-slots {
    padding: 8px;
    min-height: 40px;
    z-index: 1;
  }

  .valid-target {
    background-color: rgba(72, 187, 120, 0.1);
    border-color: #48bb78;
  }

  .invalid-target {
    background-color: rgba(245, 101, 101, 0.1);
    border-color: #f56565;
  }

  .remove-node-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px;
    color: #94a3b8;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-node-btn:hover {
    color: #ef4444;
    background: #fee2e2;
  }

  .remove-child {
    padding: 2px;
    color: #94a3b8;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-child:hover {
    color: #ef4444;
    background: #fee2e2;
  }

  .node.selected {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  /* Container type-specific backgrounds */
  .node.parallel .container-zone {
    background: rgba(99, 102, 241, 0.05);
  }

  .node.sequence .container-zone {
    background: rgba(139, 92, 246, 0.05);
  }
</style>