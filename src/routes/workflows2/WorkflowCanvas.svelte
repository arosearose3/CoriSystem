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

  $: workflow = $workflowStore;

  let planName = $workflowStore.planData?.name || '';
  let planTitle = $workflowStore.planData?.title || '';
  let planSubtitle = $workflowStore.planData?.subtitle || '';
  let planDescription = $workflowStore.planData?.description || '';
  let planPurpose = $workflowStore.planData?.purpose || '';
  let planUsage = $workflowStore.planData?.usage || '';
  let planAuthor = $workflowStore.planData?.author || '';

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  const FHIR_BASE_URL = "https://healthcare.googleapis.com/v1/projects/combine-fhir-smart-store/locations/us-central1/datasets/COMBINE-FHIR-v1/fhirStores/1/fhir";



  let edgeData = [];

  $: {
    // Make sure we have valid arrays to work with
    const edges = Array.isArray(workflow?.edges) ? workflow.edges : [];
    const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
    
    edgeData = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const points = calculateEdgePoints(edge, nodes);  // Pass the whole nodes array
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

    //put the ResponsePath activity into the plan first 
    planDefinition.action.push(action);

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
        planDefinition.action.push(responseAction);
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

    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    if (incomingEdges.length > 0) {
        action.input = incomingEdges.map(edge => edge.mapping);

    }

    // Rest of function stays the same...
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

function createInputOutputMapping(sourceNode, targetNode, sourcePort, targetPort) {
    return {
        inputName: targetPort.dataset.inputName,
        inputType: targetPort.dataset.dataType,
        valueExpression: {
            language: "text/fhirpath",
            expression: `%${sourceNode.id}.output.${sourcePort.dataset.outputName}`
        }
    };
}


function generateFhirPlanDefinition(workflow) {
    const FHIR_BASE_URL = "https://healthcare.googleapis.com/v1/projects/combine-fhir-smart-store/locations/us-central1/datasets/COMBINE-FHIR-v1/fhirStores/1/fhir";

    // Validate required event trigger
    const eventNode = workflow.nodes.find(n => n.type === 'event');
    if (!eventNode) {
        console.error('PlanDefinition requires an event trigger');
        return null;
    }

    const trigger = generateTriggerDefinition(eventNode);
    if (!trigger) {
        console.error('Failed to generate trigger definition');
        return null;
    }

    // Find first activity after event
    const firstActivityEdge = workflow.edges.find(e => e.source === eventNode.id);
    if (!firstActivityEdge) {
        console.error('Event must be connected to an activity');
        return null;
    }

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
        // Track processed nodes to avoid duplication
        const processedNodes = new Set();
        processedNodes.add(eventNode.id); // Mark event node as processed

        // Process nodes in order of connections
        const processNode = (nodeId, prevAction = null, isFirstNode = false) => {
            if (processedNodes.has(nodeId)) return;
            
            const node = workflow.nodes.find(n => n.id === nodeId);
            if (!node || node.type === 'event') return;
            
            processedNodes.add(nodeId);

            // Create action for this node
            const action = createActionFromNode(node, FHIR_BASE_URL);

            // Add trigger to first activity only
            if (isFirstNode) {
                action.trigger = [trigger];
            } else if (prevAction) {
                action.relatedAction = [{
                    actionId: prevAction.id,
                    relationship: "after-end"
                }];
            }

            if (node.data.isResponseNode) {
                // Handle response path node
                const responseEdges = workflow.edges.filter(e => 
                    e.source === node.id && e.responseValue
                );

                // Add the response node action first
                planDefinition.action.push(action);

                // Process each response path
                responseEdges.forEach(edge => {
                    const targetNode = workflow.nodes.find(n => n.id === edge.target);
                    if (!targetNode) return;

                    const responseAction = createActionFromNode(targetNode, FHIR_BASE_URL);
                    responseAction.condition = [{
                        kind: "applicability",
                        expression: {
                            language: "text/fhirpath",
                            expression: `Task.output.where(name='responseResult').value = '${edge.responseValue}'`
                        }
                    }];
                    responseAction.relatedAction = [{
                        actionId: action.id,
                        relationship: "after-end"
                    }];

                    planDefinition.action.push(responseAction);
                    processedNodes.add(targetNode.id);
                });
            } else {
                // Regular node
                if (node.data.condition) {
                    action.condition = [createConditionElement(node.data.condition)];
                }
                planDefinition.action.push(action);

                // Process outgoing edges for non-response nodes
                const outgoingEdges = workflow.edges.filter(e => 
                    e.source === node.id && !e.responseValue
                );
                outgoingEdges.forEach(edge => {
                    processNode(edge.target, action, false);
                });
            }
        };

        // Start processing from first activity after event
        processNode(firstActivityEdge.target, null, true);

        return cleanPlanDefinition(planDefinition);
    } catch (error) {
        console.error('Error generating FHIR PlanDefinition:', error);
        return null;
    }
}

  
function cleanPlanDefinition(planDefinition) {
  if (planDefinition?.action) {
    planDefinition.action = planDefinition.action.map(action => {
      if (Array.isArray(action.input)) {
        // Check if input array is empty or only contains null values
        const hasValidInput = action.input.some(item => item !== null && item !== undefined);
        if (!hasValidInput) {
          delete action.input; // Remove the input property
        }
      }
      return action;
    });
  }
  return planDefinition;
}

  onMount(() => {
 //   console.log('Canvas: Mounted');
    initCanvas();
  });

  function initCanvas() {
    // Canvas initialization if needed
  //  console.log('Canvas: Initialized');
  }

  function getNodeUnderCursor(event) {
  // Look for either a port or a node that can receive connections
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const portElement = element?.closest('.port');
  const nodeElement = element?.closest('.node[data-can-receive-connections="true"]');
  
  return portElement || nodeElement;
}

function updateConnectionHoverState(element) {
  // Remove previous hover state
  document.querySelectorAll('.connection-hover').forEach(el => {
    el.classList.remove('connection-hover');
  });

  // Add hover state to current element
  if (element?.classList.contains('node')) {
    element.classList.add('connection-hover');
  }
}
    // Track mouse movement when drawing connections
  function handleMouseMove(event) {
      if (dragState) {
        const rect = canvasEl.getBoundingClientRect();
        currentMousePosition = {
          x: event.clientX - rect.left + canvasEl.scrollLeft,
          y: event.clientY - rect.top + canvasEl.scrollTop
        };

        // Update connection hover state
        const hoveredNode = getNodeUnderCursor(event);
        updateConnectionHoverState(hoveredNode);
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

// In Canvas.svelte handleDrop function:

function handleDrop(event) {
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

        // REVISED - Detection of Response Path activities
        if (data.type === 'activity' && data.template) {
            const dynamicValues = data.template.dynamicValue || [];
            
            // Check for async/response path configuration
// Use this EVERYWHERE instead of current checks:
          const isResponsePath = dynamicValues?.some(dv => dv.path === '/Task/async/type');

            // If it's a response path activity, get the valid responses
            if (isResponsePath) {
              data.isResponseNode = true;
              data.width = 240;
              data.height = 160;

 
                const validResponsesValue = dynamicValues.find(dv => 
                    dv.path === '/Task/async/validResponses'
                )?.expression?.expression || '["approved", "rejected"]';
                
                // Parse the response values - handle string format '["approved", "rejected"]'
                const validResponses = JSON.parse(validResponsesValue);

                // Configure the node as a Response Path node
                data.isResponseNode = true;
                data.width = 240;
                data.height = 160;

                // Set up the outputs
                data.outputs = [
                    {
                        id: `${data.id || 'node'}-sent`,
                        name: 'sent',
                        type: 'standard',
                        position: 'bottom'
                    },
                    ...validResponses.map(response => ({
                        id: `${data.id || 'node'}-${response}`,
                        name: response,
                        type: 'response',
                        responseValue: response,
                        position: 'right'
                    }))
                ];
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
    const { nodeId, portType, portId, position, isResponseOutput } = event.detail;
    
    dragState = { 
      ...event.detail,
      startPosition: position,
      isResponseOutput
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleConnectionEnd);
  }

  function canConnect(sourcePort, targetPort) {
  if (!sourcePort || !targetPort) {
    console.log('Missing source or target port');
    return false;
  }

  // Get the port types from the dataset
  const sourceType = sourcePort.dataset?.portType;
  const targetType = targetPort.dataset?.portType;

  // First, check if we're connecting to an input port
  if (targetType !== 'input') {
    console.log('Target must be an input port');
    return false;
  }

  // Allow connections from any output port to an input port
  if (sourcePort.classList.contains('port-output')) {
    return true;
  }

  // Special handling for response path outputs
  if (sourcePort.dataset?.responseValue) {
    return true;
  }

  console.log('Connection not allowed:', {
    sourceType,
    targetType,
    sourceClasses: sourcePort.classList,
    targetClasses: targetPort.classList
  });
  return false;
}

function handlePlanDataChange() {
  workflowStore.updatePlanData({
    name: planName,
    title: planTitle,
    subtitle: planSubtitle,
    description: planDescription,
    purpose: planPurpose,
    usage: planUsage,
    author: planAuthor
  });
}

function handlePortConnection(portElement) {
  const targetNodeId = portElement.dataset.nodeId;
  const targetPortId = portElement.dataset.portId;

  // Find the source port element
  const sourcePort = document.querySelector(`[data-port-id="${dragState.sourcePortId}"]`);
  
  if (canConnect(sourcePort, portElement)) {
    createConnection(dragState.sourceNodeId, targetNodeId, dragState.sourcePortId, targetPortId, sourcePort);
  }
}

function handleNodeConnection(nodeElement) {
  const targetNodeId = nodeElement.dataset.nodeId;
  const sourcePort = document.querySelector(`[data-port-id="${dragState.sourcePortId}"]`);
  
  if (canConnectToNode(sourcePort, nodeElement)) {
    // For nodes without input ports, we create a virtual port ID
    const virtualPortId = `${targetNodeId}-virtual-input`;
    createConnection(dragState.sourceNodeId, targetNodeId, dragState.sourcePortId, virtualPortId, sourcePort);
  }
}

function canConnectToNode(sourcePort, targetNode) {
  // Only allow connections to nodes that have all inputs defined at creation
  return targetNode.dataset.canReceiveConnections === 'true' && sourcePort;
}

function createConnection(sourceNodeId, targetNodeId, sourcePortId, targetPortId, sourcePort) {
  const sourceNode = workflow.nodes.find(n => n.id === sourceNodeId);
  const targetNode = workflow.nodes.find(n => n.id === targetNodeId);

  const edge = {
    id: `edge-${Date.now()}`,
    source: sourceNodeId,
    target: targetNodeId,
    sourcePort: sourcePortId,
    targetPort: targetPortId,
    ...(sourcePort.dataset.responseValue && {
      responseValue: sourcePort.dataset.responseValue,
      isResponsePath: true
    })
  };
  
  workflowStore.addEdge(edge);
}

function createEventTriggerConnection(targetNodeId) {
    const edge = {
        id: `edge-${Date.now()}`,
        source: dragState.sourceNodeId,
        target: targetNodeId,
        isEventTrigger: true
    };
    
    workflowStore.addEdge(edge);
}


function handleConnectionEnd(event) {
    if (!dragState) return;

    // Clean up listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleConnectionEnd);

    // Remove hover states
    document.querySelectorAll('.connection-hover').forEach(el => {
        el.classList.remove('connection-hover');
    });

    // Get elements under mouse
    const elementsUnderMouse = document.elementsFromPoint(event.clientX, event.clientY);
    const targetNodeElement = elementsUnderMouse.find(el => 
        el.classList.contains('node') && el.dataset.type === 'activity'
    );

    if (targetNodeElement) {
        const targetNodeId = targetNodeElement.dataset.nodeId;

        // Handle different types of connections
        if (dragState.isEventTrigger) {
            // Event trigger connection
            workflowStore.addEdge({
                id: `edge-${Date.now()}`,
                source: dragState.sourceNodeId,
                target: targetNodeId,
                isEventTrigger: true
            });
        } else if (dragState.isResponseOutput) {
            // Response path connection
            workflowStore.addEdge({
                id: `edge-${Date.now()}`,
                source: dragState.nodeId,
                target: targetNodeId,
                sourcePort: dragState.portId,
                targetPort: `${targetNodeId}-input`,
                isResponsePath: true,
                responseValue: dragState.portId.split('-').pop() // 'approved' or 'rejected'
            });
        } else {
            // Regular port connection
            const targetPort = targetNodeElement.querySelector('.port-input');
            if (targetPort) {
                workflowStore.addEdge({
                    id: `edge-${Date.now()}`,
                    source: dragState.nodeId,
                    target: targetNodeId,
                    sourcePort: dragState.portId,
                    targetPort: targetPort.dataset.portId
                });
            }
        }
    }

    dragState = null;
}

function calculateEdgePoints(edge, nodes) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    if (edge.isEventTrigger) {
        return {
            start: {
                x: sourceNode.position.x + sourceNode.data.width,
                y: sourceNode.position.y + (sourceNode.data.height / 2)
            },
            end: {
                x: targetNode.position.x,
                y: targetNode.position.y
            }
        };
    }

    // Regular connections
    return {
        start: {
            x: sourceNode.position.x + sourceNode.data.width,
            y: sourceNode.position.y + (sourceNode.data.height / 2)
        },
        end: {
            x: targetNode.position.x,
            y: targetNode.position.y + (targetNode.data.height / 2)
        }
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

function generateEdgePath(points) {
    if (!points || !points.start || !points.end) return '';
    
    // Get the start and end points
    const { start, end } = points;
    
    // Calculate control points for a curved path
    // Move the control points closer to their respective endpoints
    // to create a more natural curve
    const controlPoint1 = {
        x: start.x + Math.abs(end.x - start.x) * 0.4,
        y: start.y
    };
    
    const controlPoint2 = {
        x: end.x - Math.abs(end.x - start.x) * 0.4,
        y: end.y
    };
    
    // Generate the SVG path using cubic Bezier curve
    return `M ${start.x} ${start.y} ` +            // Move to start point
           `C ${controlPoint1.x} ${controlPoint1.y}, ` +  // First control point
           `${controlPoint2.x} ${controlPoint2.y}, ` +    // Second control point
           `${end.x} ${end.y}`;                          // End point
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
              on:input={handlePlanDataChange}
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
              on:input={handlePlanDataChange}
              placeholder="Human friendly title"
          />
      </div>

      <div class="form-group">
          <label class="label">Subtitle</label>
          <input 
              type="text" 
              class="input" 
              bind:value={planSubtitle}
              on:input={handlePlanDataChange}
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
              on:input={handlePlanDataChange}
              rows="3"
          ></textarea>
      </div>

      <div class="form-group">
          <label class="label">Purpose</label>
          <textarea 
              class="input" 
              bind:value={planPurpose}
              placeholder="Why this workflow exists"
              on:input={handlePlanDataChange}
              rows="2"
          ></textarea>
      </div>

      <div class="form-group">
          <label class="label">Usage</label>
          <textarea 
              class="input" 
              bind:value={planUsage}
              on:input={handlePlanDataChange}
              placeholder="How this workflow should be used"
              rows="2"
          ></textarea>
      </div>

      <div class="form-group">
          <label class="label">Author</label>
          <input 
              type="text" 
              class="input" 
              on:input={handlePlanDataChange}
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
          {@const points = calculateEdgePoints(data.edge, workflow.nodes)}
          <path
              class="edge"
              class:event-trigger={data.edge.isEventTrigger}
              d={generateEdgePath(points)}
              stroke={data.edge.isEventTrigger ? '#4A90E2' : '#666'}
              stroke-width="2"
              fill="none"
          />
      {/each}

      <!-- Preview line while dragging -->
      {#if dragState && currentMousePosition}
      <path
          class="edge-preview"
          class:response-path={dragState.isResponsePath}
          d={`M ${dragState.startPosition.x} ${dragState.startPosition.y}
              C ${dragState.startPosition.x + 50} ${dragState.startPosition.y},
                ${currentMousePosition.x - 50} ${currentMousePosition.y},
                ${currentMousePosition.x} ${currentMousePosition.y}`}
          stroke={dragState.isResponsePath ? '#6366f1' : '#4A90E2'}
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
          {workflow}  
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