
<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import { slide } from 'svelte/transition';
    import X  from 'lucide-svelte/icons/x';
    import Filter from 'lucide-svelte/icons/filter';
   // import ConditionBuilder from './fhirpath/FhirpathConditionBuilder.svelte';
 
    import { workflowStore } from './workflowstore.js';
  
    export let node;
    export let selected = false;

    $: isResponseNode = node.data.isResponseNode;
    $: outputs = node.data.outputs || [];
    $: standardOutput = outputs.find(o => o.type === 'standard');
    $: responseOutputs = outputs.filter(o => o.type === 'response');

    $: responseValues = responseOutputs.map(o => o.responseValue);
    $: isAsyncNode = isResponseNode && responseValues.length > 0;
    

    function getPortPosition(output, index) {
        // Input port is always centered on left side
        if (output.type === 'input') {
            return {
                top: '50%',
                left: '-6px',
                transform: 'translateY(-50%)'
            };
        }

        if (!isResponseNode) {
            // Standard nodes just have centered output
            return {
                top: '50%',
                right: '-6px',
                transform: 'translateY(-50%)'
            };
        }

        // For response nodes, we position outputs differently
        if (output.type === 'standard') {
            // Standard output goes in middle
            return {
                top: '50%',
                right: '-6px',
                transform: 'translateY(-50%)'
            };
        }

        // Calculate positions for response outputs
        const responseIndex = responseOutputs.findIndex(o => o.id === output.id);
        const totalResponses = responseOutputs.length;
        
        const topOffset = 100 / (totalResponses + 1);
        const topPosition = topOffset * (responseIndex + 1);

          return {
              top: `${topPosition}%`,
              right: '-8px',
              transform: 'translateY(-50%)'
          };
}


    let ConditionBuilder;
    async function loadConditionBuilder() {
        if (!ConditionBuilder) {
            const module = await import('./fhirpath/FhirpathConditionBuilder.svelte');
            ConditionBuilder = module.default;
        }
    }

  
    const dispatch = createEventDispatcher();
    
    let showConditionPanel = false;


    let nodeEl;
    let isDragging = false;
    let isDragOver = false;
    let dragStart = { x: 0, y: 0 };
    let position = {
      x: node?.position?.x || 0,
      y: node?.position?.y || 0
    };
  
    const isContainer = node.type === 'parallel' || node.type === 'sequence'; 

    
    $: {
      if (!isDragging && node?.position) {
        position = { ...node.position };
      }
    }


    function toggleConditionPanel() {
      showConditionPanel = !showConditionPanel;
    }

    function handleConditionChange(event) {
  const condition = event.detail.condition;
  if (!workflowStore) {
    console.error('workflowStore not available');
    return;
  }
  // Update node data with new condition
  workflowStore.updateNode(node.id, {
    ...node,
    data: {
      ...node.data,
      condition: condition
    }
  });
}

    function removeCondition() {
      workflowStore.updateNode(node.id, {
        ...node,
        data: {
          ...node.data,
          condition: null
        }
      });
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
  isDragOver = true;
}
  
function handleContainerDragLeave(event) {
  if (!isContainer) return;
  event.preventDefault();
  event.stopPropagation();
  isDragOver = false;
}
  
function handleContainerDrop(event) {
  if (!isContainer) return;
  event.preventDefault();
  event.stopPropagation();
  isDragOver = false;

  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'));
    
    if (data.type === 'parallel' || data.type === 'sequence') {
      console.warn('Cannot nest containers');
      return;
    }

    const childNode = {
      id: `child-${Date.now()}`,
      type: 'activity',
      data: {
        ...data,
        containerId: node.id
      }
    };

    workflowStore.addContainedNode(node.id, childNode);
  } catch (error) {
    console.error('Error handling container drop:', error);
  }
}

function handleConditionBuilderClose() {
    showConditionPanel = false;
  }

  </script>
  
  <div
  bind:this={nodeEl}
  class="node {node.type}"
  class:selected
  class:is-container={isContainer}
  class:response-node={isResponseNode}
  class:async-node={isAsyncNode}
  style="
      left: {position.x}px;
      top: {position.y}px;
      width: {node.data.width || (isResponseNode ? 240 : 150)}px;
      min-height: {node.data.height || (isResponseNode ? 160 : 80)}px;
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
        {#if isResponseNode}
        <div class="response-paths-info">
            <span class="response-count">{responseValues.length} Response {responseValues.length === 1 ? 'Path' : 'Paths'}</span>
            <div class="response-values">
                {#each responseValues as value}
                    <span class="response-tag">{value}</span>
                {/each}
            </div>
        </div>
    {/if}
      </h3>
      {#if node.type === 'activity'}
      <button 
        class="condition-btn"
        on:click|stopPropagation={() => toggleConditionPanel()}
        aria-label="Add condition"
      >
        <Filter size={14} />
      </button>
    {/if}
  
      <!-- Container Drop Zone -->
      {#if isContainer}
      <div
        class="container-zone"
        class:drag-over={isDragOver}
        data-node-id={node.id}
        on:dragover={handleContainerDragOver}
        on:dragleave={handleContainerDragLeave}
        on:drop={handleContainerDrop}
      >
        {#if node.children?.length}
          {#each node.children as child (child.id)}
            <div class="container-child" transition:fade>
              <span>{child.data.title || child.data.description || 'Unnamed Activity'}</span>
              <button
                class="remove-child"
                on:click|stopPropagation={() => {
                  workflowStore.removeFromContainer(node.id, child.id);
                }}
              >
                <X size={14} />
              </button>
            </div>
          {/each}
        {:else}
          <div class="drop-placeholder">
            Drop activities here
          </div>
        {/if}
      </div>
    {/if}
  
      <!-- Properties Section -->
      <div class="properties">
        <slot name="properties" />
      </div>
    </div>
  
    {#if node.data.condition}
      <div class="condition-display">
        <div class="condition-text">
          {node.data.condition}
        </div>
        <button
          class="remove-condition"
          on:click|stopPropagation={() => removeCondition()}
        >
          <X size={12} />
        </button>
      </div>
    {/if}

    <!-- Connection Ports -->
    <div
    class="port port-input"
    data-node-id={node.id}
    data-port-id="{node.id}-input"
    data-port-type="input"
    on:mousedown={(e) => handlePortMouseDown(e, 'input')}
  />
  
  <!-- Output Ports -->
  {#each outputs as output, index}
        {@const portPosition = getPortPosition(output)}
        <div
            class="port port-output"
            class:port-response={output.type === 'response'}
            style="
                top: {portPosition.top};
                right: {portPosition.right};
                left: {portPosition.left || 'auto'};
                transform: {portPosition.transform};
            "
            data-node-id={node.id}
            data-port-id={output.id}
            data-port-type="output"
            data-response-value={output.responseValue}
            on:mousedown={(e) => handlePortMouseDown(e, 'output', output)}
        >
            <span class="port-label {output.type === 'response' ? 'response-label' : ''}">
                {output.name}
            </span>
        </div>
    {/each}

  {#if showConditionPanel}
  {#await loadConditionBuilder() then _}
      <svelte:component 
          this={ConditionBuilder}
          condition={node.data.condition || ''}
          on:change={handleConditionChange}
          onClose={handleConditionBuilderClose}
      />
  {/await}
{/if}
  </div>



  <style>

.node {
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        user-select: none;
        transition: all 0.2s ease;
    }

    /* Response node specific styling */
    .node.response-node {
        border-color: #6366f1;
        background: #f5f3ff;
        min-width: 240px;
        min-height: 160px;
    }

    .port {
        width: 12px;
        height: 12px;
        background: #4A90E2;
        border: 2px solid white;
        border-radius: 50%;
        position: absolute;
        cursor: crosshair;
        transition: all 0.2s;
        z-index: 2;
    }

    .port-output .port-label {
        right: 20px;
        transform: translateY(-50%);
    }

  .port-input {
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
  }



  .response-label {
    color: #6366f1;
  }

  .port-response {
    background: #6366f1;
    width: 14px;
    height: 14px;
  }

  .port-response::after {
    content: attr(data-response-value);
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: #6366f1;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .response-indicator {
        font-size: 11px;
        padding: 2px 6px;
        background: #6366f1;
        color: white;
        border-radius: 12px;
        margin-left: 8px;
        font-weight: normal;
    }


  .port-response:hover::after {
    opacity: 1;
  }

.container-zone {
  margin: 8px -4px;
  padding: 12px;
  border: 2px dashed #ccc;
  border-radius: 4px;
  min-height: 120px;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease-in-out;
}

.container-zone.drag-over {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 2px #3b82f6;
  transform: scale(1.01);
}

.container-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin: 6px 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.875rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.container-child:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  transform: translateX(2px);
}

.remove-child {
    padding: 4px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.remove-child:hover {
    background: #fee2e2;
    color: #ef4444;
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
  
 

  .port:hover {
    transform: scale(1.2);
    background-color: #357ABD;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
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

    .node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

  .condition-btn {
    padding: 4px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .condition-btn:hover {
    color: #3b82f6;
    background: #eff6ff;
  }

  .condition-display {
    margin: 8px 0;
    padding: 6px 8px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .condition-text {
    font-family: ui-monospace, monospace;
    color: #1e293b;
  }

  .remove-condition {
    padding: 2px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
  }

  .remove-condition:hover {
    color: #ef4444;
    background: #fee2e2;
  }


  .response-paths-info {
    margin-top: 8px;
    padding: 4px 8px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 4px;
    font-size: 11px;
}

.response-count {
    color: #6366f1;
    font-weight: 500;
}

.response-values {
    margin-top: 4px;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.response-tag {
    padding: 2px 6px;
    background: #6366f1;
    color: white;
    border-radius: 12px;
    font-size: 10px;
}

.async-node .node-title::after {
    content: "⏳";
    margin-left: 6px;
    font-size: 12px;
}

/* Update existing styles */
.port-response {
    background: #6366f1;
    width: 14px;
    height: 14px;
    transition: all 0.2s ease-in-out;
}

.port-response:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

.response-label {
    color: #6366f1;
    font-weight: 500;
}

  </style>