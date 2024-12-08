<!-- lib/components/Canvas.svelte - CHANGED -->
<script>
  import { onMount } from 'svelte';
  import { workflowStore } from './workflowstore.js';
  import Node from './Node.svelte';
  import { base } from '$app/paths'; 
  import { fade, slide } from 'svelte/transition';


  let canvasEl;
  let isDragging = false;
  let dragState = null;
  let isDragOver = false;  // Added to show visual feedback
  let currentMousePosition = { x: 0, y: 0 };
  let showPreview = false;
  let planDefinitionJson = '';

  let showProperties = false;

  let planName = '';
  let planTitle = '';
  let planSubtitle = '';
  let planDescription = '';
  let planPurpose = '';
  let planUsage = '';
  let planAuthor = '';

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  const FHIR_BASE_URL = "https://healthcare.googleapis.com/v1/projects/combine-fhir-smart-store/locations/us-central1/datasets/COMBINE-FHIR-v1/fhirStores/1/fhir";


  $: workflow = $workflowStore;

  let edgeData = [];

  $: {
    edgeData = workflow.edges.map(edge => {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      const targetNode = workflow.nodes.find(n => n.id === edge.target);
      const points = calculateEdgePoints(sourceNode, targetNode);
      return {
        edge,
        points,
        isResponsePath: edge.isResponsePath
      };
    }).filter(data => data.points !== null);
  }
  

  function toggleProperties() {
    showProperties = !showProperties;
}

  function togglePreview() {
    if (!showPreview) {
      const planDefinition = generateFhirPlanDefinition(workflow);
      planDefinitionJson = JSON.stringify(planDefinition, null, 2);
    }
    showPreview = !showPreview;
  }



  function generateTriggerDefinition(eventNode) {
  console.log('Generating trigger for event node:', eventNode);

  // Get trigger type from either properties or original trigger
  const triggerType = eventNode.data.properties?.triggerType || 
                     eventNode.data.trigger?.[0]?.type ||
                     "named-event";  // Default

  const trigger = {
    type: triggerType
  };

  switch (triggerType) {
    case "named-event":
      // Try both possible locations for the webhook name
      const webhookName = eventNode.data.properties?.webhook || 
                         eventNode.data.trigger?.[0]?.name;
      
      if (!webhookName) {
        console.warn('Named event trigger missing required webhook name', eventNode);
        return null;
      }
      trigger.name = webhookName;
      break;

    case "data-changed":
      if (!eventNode.data.properties?.resourceType) {
        console.warn('Data changed trigger missing required resource type', eventNode);
        return null;
      }
      trigger.data = [{
        type: eventNode.data.properties.resourceType,
        profile: [`http://hl7.org/fhir/StructureDefinition/${eventNode.data.properties.resourceType}`]
      }];
      if (eventNode.data.properties?.searchCriteria) {
        trigger.data[0].codeFilter = [{
          path: eventNode.data.properties.searchCriteria
        }];
      }
      break;

    case "periodic":
      if (!eventNode.data.properties?.schedule) {
        console.warn('Periodic trigger missing required schedule', eventNode);
        return null;
      }
      trigger.timingTiming = {
        repeat: {
          frequency: eventNode.data.properties.frequency,
          period: eventNode.data.properties.period,
          periodUnit: eventNode.data.properties.periodUnit
        }
      };
      break;

    default:
      console.warn(`Unsupported trigger type: ${triggerType}`, eventNode);
      return null;
  }

  return trigger;
}


function createConditionElement(expression) {
    return {
        kind: "applicability",
        expression: {
            language: "text/fhirpath",
            expression: expression
        }
    };
}

function createActionFromNode(node, FHIR_BASE_URL) {
    return {
        id: node.id,
        title: node.data.title,
        definitionCanonical: `${FHIR_BASE_URL}/ActivityDefinition/${node.data.template}`,
        type: {
            coding: [{
                system: "http://terminology.hl7.org/CodeSystem/action-type",
                code: "create"
            }]
        }
    };
}

function handleResponsePathNode(node, action, workflow, planDefinition) {
    // Find all edges that come from this node's response ports
    const responseEdges = workflow.edges.filter(edge => 
        edge.source === node.id && edge.responseValue
    );

    // For each response type (approved/rejected), create a condition and related action
    responseEdges.forEach(edge => {
        // Find the target node for this response
        const targetNode = workflow.nodes.find(n => n.id === edge.target);
        if (!targetNode) return;

        // Create the action for the response handler
        const responseAction = createActionFromNode(targetNode, FHIR_BASE_URL);
        
        // Add condition based on the response value
        responseAction.condition = [{
            kind: "applicability",
            expression: {
                language: "text/fhirpath",
                expression: `Task.output.where(name='responseResult').value = '${edge.responseValue}'`
            }
        }];

        // Link this action to happen after the Response Path activity
        responseAction.relatedAction = [{
            actionId: action.id,
            relationship: "after-end"
        }];

        // Add the actions to the plan
        planDefinition.action.push(action, responseAction);
    });
}

function handleRegularNode(node, action, workflow, planDefinition, trigger) {
    // If this is the first action and we have a trigger, add it
    if (!planDefinition.action.length && trigger) {
        action.trigger = [trigger];
    } 
    // Otherwise, link to the previous action
    else if (planDefinition.action.length > 0) {
        const prevAction = planDefinition.action[planDefinition.action.length - 1];
        // Only add the relation if the previous action wasn't a Response Path
        if (!prevAction.condition) {
            action.relatedAction = [{
                actionId: prevAction.id,
                relationship: "after-end"
            }];
        }
    }

    // Add any conditions from the node
    if (node.data.condition) {
        action.condition = [createConditionElement(node.data.condition)];
    }

    planDefinition.action.push(action);
}

function handleContainerNode(node, planDefinition, trigger) {
    if (!node.children?.length) return;

    const childActions = node.children.map(child => {
        const action = createActionFromNode(child, FHIR_BASE_URL);
        if (child.data.condition) {
            action.condition = [createConditionElement(child.data.condition)];
        }
        return action;
    });

    // Set up relationships between child actions
    childActions.forEach((action, index) => {
        if (index > 0) {
            action.relatedAction = [{
                actionId: childActions[0].id,
                relationship: node.type === 'parallel' ? 
                    "concurrent-with-start" : "after-end"
            }];
        }
    });

    // Add trigger to first child if this is the start
    if (!planDefinition.action.length && trigger) {
        childActions[0].trigger = [trigger];
    }

    planDefinition.action.push(...childActions);
}


function generateFhirPlanDefinition(workflow) {
    const FHIR_BASE_URL = "https://healthcare.googleapis.com/v1/projects/combine-fhir-smart-store/locations/us-central1/datasets/COMBINE-FHIR-v1/fhirStores/1/fhir";

    // Find the event node that starts our workflow
    const eventNode = workflow.nodes.find(n => n.type === 'event');
    const trigger = eventNode ? generateTriggerDefinition(eventNode) : null;

    // Initialize our PlanDefinition
    const planDefinition = {
        resourceType: "PlanDefinition",
        status: "draft",
        type: {
            coding: [{
                system: "http://terminology.hl7.org/CodeSystem/plan-definition-type",
                code: "workflow-definition"
            }]
        },
        name: planName,
        ...(planTitle && { title: planTitle }),
        ...(planSubtitle && { subtitle: planSubtitle }),
        ...(planDescription && { description: planDescription }),
        ...(planPurpose && { purpose: planPurpose }),
        ...(planUsage && { usage: planUsage }),
        date: new Date().toISOString(),
        publisher: "CoriSystem",
        ...(planAuthor && { author: [{ name: planAuthor }] }),
        action: []
    };

    try {
        // Process each node in the workflow
        workflow.nodes.forEach(node => {
            // Handle container nodes (parallel/sequence)
            if (node.type === 'parallel' || node.type === 'sequence') {
                handleContainerNode(node, planDefinition, trigger);
                return;
            }

            // Skip child nodes - they're handled by their containers
            if (node.data.containerId) return;

            // Process regular activity nodes
            if (node.type === 'activity') {
                const action = createActionFromNode(node, FHIR_BASE_URL);
                
                // If this is a Response Path activity, we need special handling
                if (node.data.isResponseNode) {
                    handleResponsePathNode(node, action, workflow, planDefinition);
                } else {
                    // Regular sequential activity
                    handleRegularNode(node, action, workflow, planDefinition, trigger);
                }
            }
        });

        return planDefinition;

    } catch (error) {
        console.error('Error generating FHIR PlanDefinition:', error);
        return null;
    }
}

  
  onMount(() => {
 //   console.log('Canvas: Mounted');
    initCanvas();
  });

  function initCanvas() {
    // Canvas initialization if needed
  //  console.log('Canvas: Initialized');
  }

    // Track mouse movement when drawing connections
    function handleMouseMove(event) {
    if (dragState) {
      const rect = canvasEl.getBoundingClientRect();
      currentMousePosition = {
        x: event.clientX - rect.left + canvasEl.scrollLeft,
        y: event.clientY - rect.top + canvasEl.scrollTop
      };
    }
  }



  function handleDragEnter(event) {
  //  console.log('Canvas: Drag ENTER');
    isDragOver = true;
  }

  function handleDragLeave(event) {
   // console.log('Canvas: Drag LEAVE');
    isDragOver = false;
  }

function handleDragOver(event) {
  //  console.log('Canvas: Drag OVER');
    // Important: These are required for drop to work
    event.preventDefault();
    event.stopPropagation();
    isDragOver = true;
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver = false;
    
    try {
        let jsonData = event.dataTransfer.getData('application/json');
        if (!jsonData) {
            jsonData = event.dataTransfer.getData('text/plain');
        }

        if (!jsonData) {
            throw new Error('No valid data received');
        }

        const data = JSON.parse(jsonData);
        const rect = canvasEl.getBoundingClientRect();
        const position = {
            x: event.clientX - rect.left + canvasEl.scrollLeft,
            y: event.clientY - rect.top + canvasEl.scrollTop
        };

        // Check if dropping on a container
        const containerEl = event.target.closest('.container-zone');
        if (containerEl) {
            const containerId = containerEl.dataset.nodeId;
            data.containerId = containerId;
        }

        // Enhanced ResponsePath detection
        if (data.type === 'activity' && data.template) {
            const outputs = new Set();
            let hasResponseOutput = false;

            // Collect all output names and check for response-type outputs
            data.template.dynamicValue?.forEach(dv => {
                if (dv.path.startsWith('/Task/output[')) {
                    // Extract the output name from the path
                    const match = dv.path.match(/output\[(.*?)\]/);
                    if (match) {
                        const outputName = match[1];
                        outputs.add(outputName);
                        
                        // Check if this is a response-type output
                        if (dv.path.includes('/type') && 
                            dv.expression?.expression === 'string' &&
                            outputName.includes('response')) {
                            hasResponseOutput = true;
                        }
                    }
                }
            });

            // If we have multiple outputs including a response output, treat as ResponsePath
            const isResponsePath = outputs.size >= 2 && hasResponseOutput;

            if (isResponsePath) {
                data.isResponseNode = true;
                data.width = 240;
                data.height = 160;
                
                // Create outputs array based on the actual outputs found
                data.outputs = [
                    {
                        id: `${data.id || 'node'}-output`,
                        name: 'sent',
                        type: 'standard',
                        position: 'middle'
                    }
                ];

                // Add response outputs
                if (outputs.has('send-email-response')) {
                    data.outputs.push({
                        id: `${data.id || 'node'}-approved`,
                        name: 'approved',
                        type: 'response',
                        responseValue: 'approved',
                        position: 'bottom'
                    });
                    data.outputs.push({
                        id: `${data.id || 'node'}-rejected`,
                        name: 'rejected',
                        type: 'response',
                        responseValue: 'rejected',
                        position: 'bottom'
                    });
                }
            }
        }

        const newNode = {
            id: `node-${Date.now()}`,
            type: data.type,
            position,
            data: {
                ...data,
                containerId: data.containerId,
                width: data.width || 150,
                height: data.height || 80,
                outputs: data.outputs
            }
        };

        workflowStore.addNode(newNode);
    } catch (error) {
        console.error('Drop error:', error);
    }
}

  function handleCanvasClick(event) {
    if (event.target.classList.contains('canvas')) {
      workflowStore.setSelectedNode(null);
    }
  }

  function handleNodeMove(event) {
    const { nodeId, position } = event.detail;
    workflowStore.updateNodePosition(nodeId, position);
  }

  
  function handleConnectionStart(event) {
    console.log('Connection start:', event.detail);
    const { nodeId, portType, portId, position } = event.detail;
    
    dragState = { 
      sourceNodeId: nodeId,
      sourcePortId: portId,
      portType,
      startPosition: position 
    };

    // Add global mouse move listener
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleConnectionEnd);
  }

  function canConnect(sourcePort, targetPort) {
      if (!sourcePort || !targetPort) return false;
      
      // Allow connections from standard outputs to inputs
      if (sourcePort.dataset?.type === 'output' && targetPort.dataset?.type === 'input') {
        return true;
      }
      
      // Allow connections from response outputs to inputs
      if (sourcePort.dataset?.responseValue && targetPort.dataset?.type === 'input') {
        return true;
      }
      
      return false;
    }

  function handleConnectionEnd(event) {
    if (!dragState) return;

    // Clean up listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleConnectionEnd);

    // Check if we dropped on a port
    const portElement = event.target.closest('.port');
  if (portElement) {
    const targetNodeId = portElement.dataset.nodeId;
    const targetPortId = portElement.dataset.portId;
    const targetPortType = portElement.dataset.portType;

    if (canConnect(dragState.sourcePort, portElement)) {
      const edge = {
        id: `edge-${Date.now()}`,
        source: dragState.sourceNodeId,
        target: targetNodeId,
        sourcePort: dragState.sourcePortId,
        targetPort: targetPortId,
        responseValue: dragState.sourcePort.dataset.responseValue
      };
      
      workflowStore.addEdge(edge);
    }
  }

  dragState = null;
}

  function calculateEdgePoints(sourceNode, targetNode) {
    if (!sourceNode || !targetNode) return null;

    const sourcePort = {
      x: sourceNode.position.x + sourceNode.data.width,
      y: sourceNode.position.y + (sourceNode.data.height / 2)
    };

    const targetPort = {
      x: targetNode.position.x,
      y: targetNode.position.y + (targetNode.data.height / 2)
    };

    return {
      start: sourcePort,
      end: targetPort
    };
  }

  async function handleSavePlan() {
    try {
        const planDefinition = generateFhirPlanDefinition(workflow);
        const response = await fetch(`${base}/api/plandefinition/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(planDefinition)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save plan definition: ${response.statusText}`);
        }
        
        dispatch('saved');
        
    } catch (error) {
        console.error('Error saving plan definition:', error);
        alert('Failed to save plan definition: ' + error.message);
    }
}

</script>


<div class="button-bar">
  <div class="flex gap-4">
      <button class="btn btn-primary" on:click={handleSavePlan}>
          Save Plan
      </button>
      <button class="btn btn-secondary" on:click={() => dispatch('cancel')}>
          Cancel
      </button>
      <button 
      class="btn btn-icon"
      on:click={toggleProperties}
      aria-label={showProperties ? 'Hide Properties' : 'Show Properties'}
  >
      <svg
          class="w-5 h-5 transform transition-transform duration-200"
          class:rotate-90={!showProperties}
          class:rotate-180={showProperties}
          viewBox="0 0 20 20"
          fill="currentColor"
      >
          <path d="M5 10l5-5 5 5H5z" />
      </svg> +
  </button>
 </div>
</div>


  {#if showProperties}
      <div 
          class="plan-properties"
          transition:slide={{ duration: 300 }}
      >
  <div class="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-white">
      <div class="form-group">
          <label class="label required">Plan Name</label>
          <input 
              type="text" 
              class="input" 
              bind:value={planName} 
              placeholder="Enter plan name (required)"
              required
          />
      </div>

      <div class="form-group">
          <label class="label">Title</label>
          <input 
              type="text" 
              class="input" 
              bind:value={planTitle}
              placeholder="Human friendly title"
          />
      </div>

      <div class="form-group">
          <label class="label">Subtitle</label>
          <input 
              type="text" 
              class="input" 
              bind:value={planSubtitle}
              placeholder="Additional title information"
          />
      </div>

      <div class="form-group">
          <label class="label">Type</label>
          <input 
              type="text" 
              class="input" 
              value="workflow-definition" 
              disabled 
          />
      </div>

      <div class="form-group col-span-2">
          <label class="label">Description</label>
          <textarea 
              class="input" 
              bind:value={planDescription}
              placeholder="Describe this workflow"
              rows="3"
          ></textarea>
      </div>

      <div class="form-group">
          <label class="label">Purpose</label>
          <textarea 
              class="input" 
              bind:value={planPurpose}
              placeholder="Why this workflow exists"
              rows="2"
          ></textarea>
      </div>

      <div class="form-group">
          <label class="label">Usage</label>
          <textarea 
              class="input" 
              bind:value={planUsage}
              placeholder="How this workflow should be used"
              rows="2"
          ></textarea>
      </div>

      <div class="form-group">
          <label class="label">Author</label>
          <input 
              type="text" 
              class="input" 
              bind:value={planAuthor}
              placeholder="Workflow author"
          />
      </div>
  </div>
</div>

{/if}


<div class="preview-container">
  <button 
    class="preview-button"
    on:click={togglePreview}
  >
    {showPreview ? 'Close' : 'Preview PlanDefinition'}
  </button>

  {#if showPreview}
    <div class="preview-content">
      <pre>{planDefinitionJson}</pre>
    </div>
  {/if}
</div>

<div 
  class="canvas-container" 
  bind:this={canvasEl}
>

  <div 
    class="canvas"
    class:is-drag-over={isDragOver}
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleDrop}
  >
    <svg class="edge-layer">
      <!-- Existing edges -->
      {#each edgeData as data}
      <path
        class="edge"
        class:response-edge={data.isResponsePath}
        d={`M ${data.points.start.x} ${data.points.start.y} 
            C ${data.points.start.x + 50} ${data.points.start.y},
              ${data.points.end.x - 50} ${data.points.end.y},
              ${data.points.end.x} ${data.points.end.y}`}
        stroke={data.isResponsePath ? '#6366f1' : '#666'}
        stroke-width={data.isResponsePath ? 3 : 2}
        stroke-dasharray={data.isResponsePath ? '8,4' : 'none'}
        fill="none"
      />
    {/each}

      <!-- Preview line while dragging -->
      {#if dragState && currentMousePosition}
        <path
          class="edge-preview"
          d={`M ${dragState.startPosition.x} ${dragState.startPosition.y}
              C ${dragState.startPosition.x + 50} ${dragState.startPosition.y},
                ${currentMousePosition.x - 50} ${currentMousePosition.y},
                ${currentMousePosition.x} ${currentMousePosition.y}`}
          stroke="#4A90E2"
          stroke-width="2"
          stroke-dasharray="4"
          fill="none"
        />
      {/if}
    </svg>

    <div class="node-layer">
      {#each workflow.nodes as node (node.id)}
        <Node
          {node}
          selected={workflow.selectedNode === node.id}
          on:move={handleNodeMove}
          on:connectionStart={handleConnectionStart}
        />
      {/each}
    </div>
  </div>
</div>


<style>
  .workflow-editor {
      height: 100vh;
      display: flex;
      flex-direction: column;
  }

  .workflow-content {
      flex: 1;
      overflow-y: auto;
      position: relative;
  }

  .plan-properties {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem;
  }

  .btn-icon {
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .canvas-container {
      height: calc(100vh - 4rem); /* Adjust based on button bar height */
      transition: height 300ms ease;
  }

  .canvas-container.properties-shown {
      height: calc(100vh - 24rem); /* Adjust based on properties panel height */
  }
    .plan-properties {
    margin-bottom: 1rem;
    background: #f9fafb;
    padding: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.label.required::after {
    content: "*";
    color: #ef4444;
    margin-left: 0.25rem;
}

.input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
}

.button-bar {
    padding: 1rem;
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1rem;
}

.btn-secondary {
    background-color: #6b7280;
}

.btn-secondary:hover {
    background-color: #4b5563;
}

.edge, .edge-preview {
    pointer-events: none;
    transition: stroke 0.2s;
  }

  .edge:hover {
    stroke: #4A90E2;
    stroke-width: 3;
  }

  .response-path-edge:hover {
    stroke: #818cf8;
    stroke-width: 4;
  }

      .canvas.is-drag-over {
    background: #e8f4fd;
    border: 2px dashed #4A90E2;
  }

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
    }
  
    .edge-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
  
    .node-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  
    .edge {
      pointer-events: none;
    }
  
    .edge-preview {
      pointer-events: none;
    }

     
  .preview-container {
    padding: 1rem;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }

  .preview-button {
    padding: 0.5rem 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .preview-button:hover {
    background-color: #2563eb;
  }

  .preview-content {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    overflow: auto;
    max-height: 400px;
  }

  pre {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  </style>