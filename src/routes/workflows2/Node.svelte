
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
    export let workflow;

/*     $: {
      if (inputs){
        console.log('Node inputs:', inputs);
        console.log('Node input example:', inputs[0]);
      }
    } */

    $: isResponseNode = node.data.isResponseNode;
    $: outputs = node.data.outputs || [];
    $: standardOutput = outputs.find(o => o.type === 'standard');
    $: responseOutputs = outputs.filter(o => o.type === 'response');
    $: responseValues = responseOutputs.map(o => o.responseValue);
    $: isAsyncNode = isResponseNode && responseValues.length > 0;
    $: inputs = node.data.inputs || [];
    $: inputLabels = inputs.map(i => i.name);

    $: showInputs = node.type !== 'event' && inputs?.length > 0;

    $: canReceiveConnections = !inputs.some(input => !input.definedAtCreation); // True if all inputs are defined at creation

    $: canDrag = node.type === 'event' ? 
      workflow?.edges?.some(edge => edge.source === node.id) || 
      !workflow?.edges?.length : true;

    let ConditionBuilder;

    const PORT_TYPES = {
        // Basic Types
        string: { color: '#4A90E2', label: 'Text' },          // Blue
        number: { color: '#F6AD55', label: 'Number' },        // Orange
        boolean: { color: '#48BB78', label: 'Yes/No' },       // Green
        
        // FHIR Resource Types
        Patient: { color: '#805AD5', label: 'Patient' },      // Purple
        Practitioner: { color: '#805AD5', label: 'Practitioner' },
        Task: { color: '#F56565', label: 'Task' },           // Red
        Questionnaire: { color: '#ED8936', label: 'Form' },  // Dark Orange
        QuestionnaireResponse: { color: '#ED8936', label: 'Form Response' },
        ServiceRequest: { color: '#F56565', label: 'Service Request' },
        Goal: { color: '#38B2AC', label: 'Goal' },          // Teal
        
        // Special Types
        Event: { color: '#667EEA', label: 'Event' },        // Indigo
        Reference: { color: '#718096', label: 'Resource Reference' }, // Gray
        unknown: { color: '#A0AEC0', label: 'Unknown' }     // Default Gray
      };

      function getPortStyle(dataType) {
          const typeInfo = PORT_TYPES[dataType] || PORT_TYPES.unknown;
          return {
              backgroundColor: typeInfo.color,
              borderColor: typeInfo.color
          };
      }

function getPortPosition(port, index, type) {
    const totalPorts = type === 'input' ? inputs.length : outputs.length;
    
    if (type === 'input') {
        // Calculate spacing between inputs
        const startY = 50; // Space for title
        const availableHeight = node.data.height - startY;
        const spacing = availableHeight / (totalPorts + 1);
        
        return {
            top: `${startY + (spacing * (index + 1))}px`,
            left: '-6px',
            transform: 'translateY(-50%)'
        };
    }

    // For response path activities
    if (isResponseNode && port.type === 'response') {
        const responseIndex = responseOutputs.findIndex(o => o.id === port.id);
        const totalResponses = responseOutputs.length;
        const startY = 50; // Space for title
        const availableHeight = node.data.height - startY;
        const spacing = availableHeight / (totalResponses + 1);
        
        return {
            top: `${startY + (spacing * (responseIndex + 1))}px`,
            right: '-8px',
            transform: 'translateY(-50%)'
        };
    }

    if (isResponseNode && port.type === 'standard') {
        // The "sent" confirmation output goes at the bottom
        return {
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)'
        };
    }

    // Regular outputs - position them evenly on the right side
    const standardOutputs = outputs.filter(o => o.type === 'standard');
    const outputIndex = standardOutputs.findIndex(o => o.id === port.id);
    const startY = 50; // Space for title
    const availableHeight = node.data.height - startY;
    const spacing = availableHeight / (standardOutputs.length + 1);
    
    return {
        top: `${startY + (spacing * (outputIndex + 1))}px`,
        right: '-6px',
        transform: 'translateY(-50%)'
    };
}

function handleEventNodeMouseDown(event) {
  console.log('Event node mousedown:', {
        nodeType: node.type,
        hasOutputs: node.data.outputs?.length > 0,
        target: event.target,
        node: node
    });

    // Only handle Event nodes without outputs
    if (node.type !== 'event' || node.data.outputs?.length > 0) return;
    

    console.log('Initiating event connection');

    // Calculate the starting position for the connection
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasRect = event.currentTarget.closest('.canvas-container').getBoundingClientRect();
    
    const startPosition = {
        x: rect.left - canvasRect.left + rect.width,  // Right side of node
        y: rect.top - canvasRect.top + (rect.height / 2)  // Vertical center
    };

    dispatch('connectionStart', {
        sourceNodeId: node.id,
        portType: 'event-trigger',
        startPosition,
        position : startPosition,
        isEventTrigger: true,
        canConnectToContainer: true
    });
}

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
    // If this is an Event node that can't be dragged yet, ignore the mousedown
    if (event.target.closest('.port') || 
      event.target.closest('.remove-btn') ||
      event.target.closest('.property')) {
    return;
  }

  // If this is an event node that can't be dragged yet, handle event connection
  if (node.type === 'event' && !canDrag) {
    handleEventNodeMouseDown(event);
    return;
  }

    event.stopPropagation();
    
    isDragging = false;
    dragStart = {
        x: event.clientX - position.x,
        y: event.clientY - position.y
    };



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
  
    function handlePortMouseDown(event, portType, output) {
        event.stopPropagation();
        
        const portEl = event.target;
        const rect = portEl.getBoundingClientRect();
        const canvasRect = portEl.closest('.canvas-container').getBoundingClientRect();

        const position = {
          x: rect.left - canvasRect.left + (rect.width / 2),
          y: rect.top - canvasRect.top + (rect.height / 2)
        };

        // Include isResponseOutput flag
        dispatch('connectionStart', {
          nodeId: node.id,
          portType,
          portId: output ? output.id : `${node.id}-${portType}`,
          position,
          startPosition: position,
          sourcePort: portEl,
          isResponseOutput: output?.type === 'response'
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
  class:can-drag={canDrag}
  data-node-id={node.id}
  data-type={node.type}
  style="
      left: {position.x}px;
      top: {position.y}px;
      width: {node.data.width || (isResponseNode ? 240 : 150)}px;
      min-height: {node.data.height || (isResponseNode ? 160 : 80)}px;
  "
  on:mousedown={node.type === 'event' ? handleEventNodeMouseDown : handleMouseDown}
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

<!-- Input Ports Section -->
{#if showInputs}
    {#each inputs.filter(input => !input.definedAtCreation) as input, index}
        {@const portPosition = getPortPosition(input, index, 'input')}
        {@const portStyle = getPortStyle(input.dataType)}
        <div
            class="port port-input"
            style="
                top: {portPosition.top};
                left: {portPosition.left};
                transform: {portPosition.transform};
                background-color: {portStyle.backgroundColor};
                border-color: {portStyle.borderColor};
            "
            data-node-id={node.id}
            data-port-id={input.id}
            data-port-type="input"
            data-input-name={input.name}
            data-data-type={input.dataType}
            on:mousedown={(e) => handlePortMouseDown(e, 'input', input)}
        >
            <span class="port-label port-label-input">
                <span class="port-type-indicator" style="background-color: {portStyle.backgroundColor}"></span>
                {input.name}: {PORT_TYPES[input.dataType]?.label || 'Unknown'}
            </span>
        </div>
    {/each}

    <!-- Predefined Inputs Display -->
<!-- Predefined Inputs Display -->
    {#if inputs.some(input => input.definedAtCreation)}
        <div class="predefined-inputs-container">
            {#each inputs.filter(input => input.definedAtCreation) as input}
                <div class="predefined-input">
                    <span class="predefined-label">
                        {input.name}:
                    </span>
                    <span class="predefined-value">
                        {input.value}
                    </span>
                </div>
            {/each}
        </div>
    {/if}
{/if}


{#each outputs as output, index}
    {@const portPosition = getPortPosition(output, index, 'output')}
    {@const portStyle = getPortStyle(output.dataType)}
    <div
        class="port port-output"
        class:port-response={output.type === 'response'}
        style="
            top: {portPosition.top};
            right: {portPosition.right};
            bottom: {portPosition.bottom};
            left: {portPosition.left};
            transform: {portPosition.transform};
            background-color: {!output.type === 'response' && portStyle.backgroundColor};
            border-color: {!output.type === 'response' && portStyle.borderColor};
        "
        data-node-id={node.id}
        data-port-id={output.id}
        data-port-type="output"
        data-data-type={output.dataType}
        data-response-value={output.responseValue}
        on:mousedown={(e) => handlePortMouseDown(e, 'output', output)}
    >
        <span class="port-label">
            <span class="port-type-indicator" style="background-color: {portStyle.backgroundColor}"></span>
            {output.type === 'response' ? output.responseValue : 
             `${output.name}: ${PORT_TYPES[output.dataType]?.label || 'Unknown'}`}
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

.node.can-receive-connections {
    cursor: pointer;
    transition: box-shadow 0.2s ease;
}

.node.can-receive-connections.connection-hover {
    box-shadow: 0 0 0 2px #4A90E2;
}

.predefined-inputs-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 4px;
}

.predefined-input {
    padding: 6px 8px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.predefined-label {
    color: #4b5563;
}

.predefined-value {
    font-weight: 500;
    color: #1f2937;
}

    .async-node .node-title::after {
        content: "⏳";
        margin-left: 6px;
        font-size: 12px;
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
    
    .drop-placeholder {
        color: #94a3b8;
        text-align: center;
        padding: 8px;
        font-style: italic;
    }
    
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
    
    .node.container {
        border-color: #6366f1;
    }
    
    .node.event {
        border-color: #48bb78;
        cursor: default;
    }

    .node.event.can-drag {
    cursor: move;
    }
    
    .node-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .node.is-container {
        min-width: 300px;
        min-height: 200px;
    }
    
    .node.response-node {
        border-color: #6366f1;
        background: #f5f3ff;
    }
    
    .node.selected {
        box-shadow: 0 0 0 2px #3b82f6;
    }
    
    .node.task {
        border-color: #4299e1;
    }
    
    .node[data-node-type="event"] .port-output {
        background: #48bb78;
    }
    
    .node-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
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
        background: #4A90E2;
        border: 2px solid white;
        border-radius: 50%;
        position: absolute;
        cursor: crosshair;
        transition: all 0.2s;
        z-index: 2;
    }
    
    .port:hover .port-label {
        opacity: 1;
        background: rgba(0, 0, 0, 0.7);
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
        font-size: 10px;
    }
    
    .port-input {
        left: -6px;
        top: 50%;
        transform: translateY(-50%);
    }
    
    .port-label {
        display: inline-block;
        white-space: nowrap;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .port-label-input {
        left: 20px;
        right: auto;
    }
    
    .port-output {
        background: #4A90E2;
        position: absolute;
    }
    
    .port-response {
        background: #6366f1;
        width: 14px;
        height: 14px;
        transition: all 0.2s ease-in-out;
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
    
    .port-response:hover::after {
        opacity: 1;
    }
    
    .port-standard {
        background: #4A90E2;
    }
    
    .port-type-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    
    .properties {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 8px;
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
    
    .response-count {
        color: #6366f1;
        font-weight: 500;
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
    
    .response-label {
        color: #6366f1;
    }
    
    .response-paths-info {
        margin-top: 8px;
        padding: 4px 8px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 4px;
        font-size: 11px;
    }
    
    .response-tag {
        padding: 2px 6px;
        background: #6366f1;
        color: white;
        border-radius: 12px;
        font-size: 10px;
    }
    
    .response-values {
        margin-top: 4px;
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }
    </style>
    