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


function generateFhirPlanDefinition(workflow) {
   const FHIR_BASE_URL = "https://healthcare.googleapis.com/v1/projects/combine-fhir-smart-store/locations/us-central1/datasets/COMBINE-FHIR-v1/fhirStores/1/fhir";

   const eventNode = workflow.nodes.find(n => n.type === 'event');
   const trigger = eventNode ? generateTriggerDefinition(eventNode) : null;

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
       workflow.nodes.forEach(node => {
           if (node.type === 'parallel' || node.type === 'sequence') {
               if (node.children?.length) {
                   const childActions = node.children.map(child => {
                       const action = {
                           id: child.id,
                           title: child.data.title,
                           definitionCanonical: `${FHIR_BASE_URL}/ActivityDefinition/${child.data.template}`,
                           type: {
                               coding: [{
                                   system: "http://terminology.hl7.org/CodeSystem/action-type",
                                   code: "create"
                               }]
                           }
                       };

                       if (child.data.condition) {
                           action.condition = [createConditionElement(child.data.condition)];
                       }

                       return action;
                   });

                   childActions.forEach((action, index) => {
                       if (index > 0) {
                           if (!action.relatedAction) action.relatedAction = [];
                           action.relatedAction.push({
                               actionId: childActions[0].id,
                               relationship: node.type === 'parallel' ? 
                                   "concurrent-with-start" : "after-end"
                           });
                       }
                       if (index === 0 && trigger) {
                           action.trigger = [trigger];
                       }
                   });

                   planDefinition.action.push(...childActions);
               }
           } else if (node.type === 'activity' && !node.data.containerId) {
               const action = {
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

               if (node.data.condition) {
                   action.condition = [createConditionElement(node.data.condition)];
               }

               if (!planDefinition.action.length && trigger) {
                   action.trigger = [trigger];
               } else if (planDefinition.action.length > 0) {
                   action.relatedAction = [{
                       actionId: planDefinition.action[planDefinition.action.length - 1].id,
                       relationship: "after-end"
                   }];
               }

               planDefinition.action.push(action);
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

    const newNode = {
      id: `node-${Date.now()}`,
      type: data.type,
      position,
      data: {
        ...data,
        containerId: data.containerId
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

  function canConnect(sourceType, targetType) {
    return sourceType === 'output' && targetType === 'input';
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

      // Validate connection
      if (canConnect(dragState.portType, targetPortType)) {
        const edge = {
          id: `edge-${Date.now()}`,
          source: dragState.sourceNodeId,
          target: targetNodeId,
          sourcePort: dragState.sourcePortId,
          targetPort: targetPortId
        };
        
        console.log('Creating edge:', edge);
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
      {#each workflow.edges as edge (edge.id)}
        {@const points = calculateEdgePoints(
          workflow.nodes.find(n => n.id === edge.source),
          workflow.nodes.find(n => n.id === edge.target)
        )}
        {#if points}
          <path
            class="edge"
            d={`M ${points.start.x} ${points.start.y} 
                C ${points.start.x + 50} ${points.start.y},
                  ${points.end.x - 50} ${points.end.y},
                  ${points.end.x} ${points.end.y}`}
            stroke="#666"
            stroke-width="2"
            fill="none"
          />
        {/if}
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