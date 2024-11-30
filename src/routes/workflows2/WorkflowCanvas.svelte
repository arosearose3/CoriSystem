<!-- lib/components/Canvas.svelte - CHANGED -->
<script>
  import { onMount } from 'svelte';
  import { workflowStore } from './workflowstore.js';
  import Node from './Node.svelte';

  let canvasEl;
  let isDragging = false;
  let dragState = null;
  let isDragOver = false;  // Added to show visual feedback
  let currentMousePosition = { x: 0, y: 0 };

  $: workflow = $workflowStore;
  
  // Add detailed logging
  $: if (workflow) {
   // console.log('Canvas: Current workflow state:', workflow);
   
   console.log ('FHIR PlanDefinition generated:', generateFhirPlanDefinition(workflow));
  }




  function generateTriggerDefinition(eventNode) {
    // Base trigger structure
    const trigger = {
      type: eventNode.data.triggerType || "named-event" // Default to named-event if not specified
    };

    switch (trigger.type) {
      case "named-event":
        if (!eventNode.data.trigger?.[0]?.name) {
          console.warn('Named event trigger missing required name property');
          return null;
        }
        trigger.name = eventNode.data.trigger[0].name;
        break;

      case "data-changed":
        if (!eventNode.data.properties?.resourceType) {
          console.warn('Data changed trigger missing required resource type');
          return null;
        }
        // DataRequirement for FHIR resource changes
        trigger.data = [{
          type: eventNode.data.properties.resourceType,
          profile: [`http://hl7.org/fhir/StructureDefinition/${eventNode.data.properties.resourceType}`],
        }];
        // Add search criteria if present
        if (eventNode.data.properties?.searchCriteria) {
          trigger.data[0].codeFilter = [{
            path: eventNode.data.properties.searchCriteria
          }];
        }
        break;

      case "periodic":
        if (!eventNode.data.properties?.schedule) {
          console.warn('Periodic trigger missing required schedule');
          return null;
        }
        // Use timing for periodic events
        trigger.timingTiming = {
          repeat: {
            frequency: eventNode.data.properties.frequency,
            period: eventNode.data.properties.period,
            periodUnit: eventNode.data.properties.periodUnit
          }
        };
        break;

      default:
        console.warn(`Unsupported trigger type: ${trigger.type}`);
        return null;
    }

    return trigger;
  }

  function generateFhirPlanDefinition(workflow) {
    const planDefinition = {
      resourceType: "PlanDefinition",
      status: "draft",
      action: []
    };

    try {
      workflow.nodes
        .filter(n => n.type === 'task')
        .forEach(taskNode => {
          const action = {
            id: taskNode.id,
            title: taskNode.data.title,
            definitionCanonical: `Task/${taskNode.data.template}`,
            type: {
              coding: [{
                system: "http://terminology.hl7.org/CodeSystem/action-type",
                code: "create"
              }]
            }
          };

          // Find incoming edges to this task
          const incomingEdges = workflow.edges.filter(e => e.target === taskNode.id);
          
          incomingEdges.forEach(edge => {
            const sourceNode = workflow.nodes.find(n => n.id === edge.source);
            
            if (sourceNode.type === 'event') {
              const trigger = generateTriggerDefinition(sourceNode);
              if (trigger) {
                if (!action.trigger) action.trigger = [];
                action.trigger.push(trigger);
              }
            } else {
              // Task becomes a relatedAction
              if (!action.relatedAction) action.relatedAction = [];
              action.relatedAction.push({
                actionId: sourceNode.id,
                relationship: "after-end"
              });
            }
          });

          planDefinition.action.push(action);
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
   // console.log('Canvas: DROP started');
    event.preventDefault();
    event.stopPropagation();
    isDragOver = false;
    
    // Log all available data types
    console.log('Available types:', event.dataTransfer.types);
    
    try {
      let jsonData = event.dataTransfer.getData('application/json');
      console.log('Raw JSON data:', jsonData);
      
      if (!jsonData) {
        console.log('Trying text/plain fallback');
        jsonData = event.dataTransfer.getData('text/plain');
      }

      if (!jsonData) {
        throw new Error('No valid data received');
      }

      const data = JSON.parse(jsonData);
      console.log('Parsed data:', data);

      const rect = canvasEl.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left + canvasEl.scrollLeft,
        y: event.clientY - rect.top + canvasEl.scrollTop
      };
      console.log('Calculated position:', position);

      const newNode = {
        id: `node-${Date.now()}`,
        type: data.type,
        position,
        data
      };
      console.log('Creating node:', newNode);

      workflowStore.addNode(newNode);
      console.log('Node added to store');
      
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
</script>


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
  </style>