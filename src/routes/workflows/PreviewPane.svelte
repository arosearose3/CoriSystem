
<script>
  import { workflowStore } from '$lib/stores/workflow';

  export let workflow;
  let resources = {
    serviceRequest: null,
    planDefinition: null,
    eventDefinitions: [],
    activities: [],
    tasks: [],
    requestGroup: null
  };

  let generatedPlanDefinition = null;


  $: {
    if ($workflowStore && ($workflowStore.structuralChange || !resources.serviceRequest)) {
      console.log('Structural workflow update detected, regenerating resources');
      resources = generateFhirResources($workflowStore);
    }
  }

  function formatJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      //console.error('Error formatting JSON:', error);
      return '{}';
    }
  }


  function generateFhirResources(workflow) {
  console.log('Generating FHIR resources for workflow:', workflow);
    
  if (!workflow || !workflow.nodes) {
    console.warn('Invalid workflow data:', workflow);
    return resources;
  }


  try {
    // Generate all resources
   // generatedPlanDefinition = generatePlanDefinitionFromWorkflow(workflow);

    const eventDefs = generateEventDefinitions(workflow);
    const activities = generateActivityDefinitions(workflow);
    const planDef = generatePlanDefinitionFromWorkflow(workflow);

    console.log('Generated EventDefinitions:', eventDefs);
    console.log('Generated ActivityDefinitions:', activities);
    console.log('Generated PlanDefinition:', planDef);
  //  console.log('Generated newPlanDefinition:', generatePlanDefinition);

    const newResources = {
      serviceRequest: generateServiceRequest(workflow),
      eventDefinitions: eventDefs,
      planDefinition: planDef,
      activities: activities,
      tasks: workflow.tasks || [],
      requestGroup: generateRequestGroup(workflow)
    };

    return newResources;

  } catch (error) {
    console.error('Error generating FHIR resources:', error);
    return resources;
  }
}

// CHANGED: Modified function to handle triggers
function generatePlanDefinitionFromWorkflow(workflow) {
  if (!workflow || !workflow.nodes || !workflow.edges) {
    throw new Error("Invalid workflow input.");
  }

  // Helper functions remain unchanged
  const getOutgoingEdges = (nodeId) =>
    workflow.edges.filter((edge) => edge.source === nodeId);

  const getIncomingEdge = (nodeId) =>
    workflow.edges.find((edge) => edge.target === nodeId);

  // ADDED: New function to create trigger based on event type
  function createTrigger(eventNode) {
    const baseTrigger = {
      type: "named-event", // default, will be overridden as needed
    };

    switch (eventNode.data.type) {
      case "timer":
        return {
          type: "periodic",
          timing: {
            // Convert node.data.timing to FHIR timing structure
            repeat: {
              frequency: eventNode.data.frequency || 1,
              period: eventNode.data.period || 1,
              periodUnit: eventNode.data.periodUnit || "d"
            }
          }
        };

      case "fhirchange":
        return {
          type: "data-changed",
          data: [{
            type: eventNode.data.resourceType || "Resource",
            profile: eventNode.data.profile ? 
              [`http://hl7.org/fhir/StructureDefinition/${eventNode.data.profile}`] : 
              undefined,
            codeFilter: eventNode.data.codeFilter || []
          }],
          condition: eventNode.data.condition // Optional FHIR FHIRPath expression
        };

      case "webhook":
        return {
          type: "named-event",
          name: eventNode.data.webhookName || "external-trigger"
        };

      default:
        throw new Error(`Unsupported event type: ${eventNode.data.type}`);
    }
  }

  // CHANGED: Modified buildAction to handle triggers
  function buildAction(nodeId, processedNodes = new Set()) {
    if (processedNodes.has(nodeId)) return null;
    processedNodes.add(nodeId);

    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const outgoingEdges = getOutgoingEdges(nodeId);

    // Base action structure
    const action = {
      id: node.id,
      title: node.data?.title || node.data.type || "Untitled",
      description: node.data?.description || "",
      type: {
        coding: [{
          code: node.data.type,
          display: node.data.type.charAt(0).toUpperCase() + node.data.type.slice(1),
        }],
      },
    };

    // ADDED: Handle event triggers
    if (["webhook", "fhirchange", "timer"].includes(node.data.type)) {
      action.trigger = [createTrigger(node)];
    }

    // Rest of action building remains the same
    if (node.data.type === "parallel" || node.data.type === "sequence") {
      const isParallel = node.data.type === "parallel";
      const children = outgoingEdges
        .map((edge) => buildAction(edge.target, processedNodes))
        .filter(Boolean);
      action.action = children;
      action.extension = [{
        url: "http://hl7.org/fhir/StructureDefinition/workflow-pattern",
        valueCode: isParallel ? "parallel" : "sequential",
      }];
    } else if (node.data.type === "activity") {
      const children = outgoingEdges
        .map((edge) => buildAction(edge.target, processedNodes))
        .filter(Boolean);
      action.action = children;
    }

    const incomingEdge = getIncomingEdge(nodeId);
    if (incomingEdge) {
      action.relatedAction = [{
        actionId: incomingEdge.source,
        relationship: "after-end",
      }];
    }

    return action;
  }

  // Find event node
  const eventNode = workflow.nodes.find((node) =>
    ["webhook", "fhirchange", "timer"].includes(node.data.type)
  );

  if (!eventNode) {
    throw new Error("No event node found in the workflow.");
  }

  const rootAction = buildAction(eventNode.id);

  // Build the PlanDefinition
  const planDefinition = {
    resourceType: "PlanDefinition",
    id: workflow.name.toLowerCase().replace(/\s+/g, "-"),
    title: workflow.name || "Untitled Workflow",
    status: "active",
    date: new Date().toISOString(),
    action: rootAction ? [rootAction] : [],
  };

  return planDefinition;
}


  function generateServiceRequest(workflow) {
    return {
      resourceType: "ServiceRequest",
      id: `sr-${Date.now()}`,
      status: "active",
      intent: "order",
      subject: {
        reference: "Patient/example"
      },
      code: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/service-type",
          code: "workflow",
          display: workflow.name || "Workflow Service"
        }]
      },
      authoredOn: new Date().toISOString()
    };
  }


  function generateEventDefinitions(workflow) {
  return workflow.nodes
    .filter(n => n.data.type === 'webhook' || n.data.type === 'fhir-change' || n.data.type === 'timer')
    .map(node => ({
      resourceType: "EventDefinition",
      id: node.id,
      status: "active",
      name: `${node.data.type}-event`,
      trigger: [{
        type: "named-event",
        name: node.data.type,
        condition: {
          expression: {
            description: node.label,
            language: "text/fhirpath",
            expression: "true"
          }
        }
      }]
    }));
}

 
function generatePlanDefinition(workflow) {
  // Find all event nodes
  const eventNodes = workflow.nodes.filter(n => 
    n.data.type === 'webhook' || n.data.type === 'fhir-change' || n.data.type === 'timer'
  );
  
  // For each event node, find connected action nodes
  const planActions = [];
  
  eventNodes.forEach(eventNode => {
    // Find edges where this event is the source
    const connectedEdges = workflow.edges.filter(e => e.source === eventNode.id);
    
    connectedEdges.forEach(edge => {
      // Find the target node for this edge
      const targetNode = workflow.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        planActions.push({
          id: targetNode.id,
          name: targetNode.data.type,
          title: targetNode.label,
          trigger: [{
            type: "named-event",
            eventName: eventNode.data.type,
            eventDefinition: {
              reference: `EventDefinition/${eventNode.id}`
            }
          }],
          definitionCanonical: `ActivityDefinition/${targetNode.id}`,
          type: {
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/action-type",
              code: "create",
              display: "Create"
            }]
          }
        });
      }
    });
  });

  return {
    resourceType: "PlanDefinition",
    id: `plan-${Date.now()}`,
    status: "active",
    name: "workflow-plan",
    title: workflow.name || "Workflow Plan Definition",
    action: planActions
  };
}

  function buildActionChain(workflow, startNodes) {
    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      console.warn('No edges found in workflow');
      return [];
    }

    const actions = [];
    const visited = new Set();

    function processNode(node) {
      if (!node || visited.has(node.id)) return;
      visited.add(node.id);

      if (node.data.type === 'activity' || node.data?.type === 'activity') {
        const action = {
          id: node.id,
          title: node.label || node.data?.title || 'Unnamed Activity',
          description: node.data?.description,
          definitionCanonical: `ActivityDefinition/${node.id}`,
          type: {
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/action-type",
              code: "create",
              display: "Create"
            }]
          }
        };

        const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
        if (outgoingEdges.length > 0) {
          action.relatedAction = outgoingEdges.map(edge => ({
            actionId: edge.target,
            relationship: "before-start"
          }));
        }

        actions.push(action);

        outgoingEdges.forEach(edge => {
          const nextNode = workflow.nodes.find(n => n.id === edge.target);
          if (nextNode) processNode(nextNode);
        });
      }
    }

    // Process all start nodes
    startNodes.forEach(eventNode => {
      const outgoingEdges = workflow.edges.filter(e => e.source === eventNode.id);
      outgoingEdges.forEach(edge => {
        const nextNode = workflow.nodes.find(n => n.id === edge.target);
        if (nextNode) processNode(nextNode);
      });
    });

    return actions;
  }
  // UNCHANGED: generateActivityDefinitions function remains the same
  function generateActivityDefinitions(workflow) {
  return workflow.nodes
    .filter(n => n.data.type !== 'webhook' && n.data.type !== 'fhirchange' && n.data.type !== 'timer')
    .map(node => ({
      resourceType: "ActivityDefinition",
      id: node.id,
      status: "active",
      name: node.data.type,
      title: node.label,
      kind: "Task",
      code: {
        coding: [{
          system: "http://example.org/activities",
          code: node.data.type,
          display: node.label
        }]
      }
    }));
}

function generateRequestGroup(workflow) {
  // Only generate RequestGroup if there are parallel task nodes
  // Nov 2024 this returns only one RequestGroup so modify for more complexity
  const parallelNodes = workflow.nodes.filter(n => n.data.type === 'parallel');
  if (!parallelNodes.length) {
    return null;
  }

  return parallelNodes.map(parallelNode => {
    const childActivities = parallelNode.children || [];
    
    return {
      resourceType: "RequestGroup",
      id: `rg-${parallelNode.id}`,
      status: "active",
      intent: "order",
      groupingBehavior: "logical-group",
      selectionBehavior: "all",
      action: childActivities.map(activity => ({
        id: activity.id,
        title: activity.label,
        resource: {
          reference: `ActivityDefinition/${activity.id}`
        }
      }))
    };
  })[0]; // Return first one for now, could be modified to handle multiple
}
  // CHANGED: Added explicit update function
  function handleUpdateClick() {
   // console.log('Manual update triggered');
    if (workflow) {
      resources = generateFhirResources({...workflow}); // Force new object
      console.log('Manually generated resources:', resources);
    }
  }
</script>

<div class="preview-pane">
  <div class="preview-header">
    <h2>FHIR Resources</h2>
    <button 
      class="update-button" 
      on:click={handleUpdateClick}
    >
      Update Resources
    </button>
  </div>

  <div class="preview-content">
    <!-- EventDefinitions -->
    <div class="section">
      <h3>Event Definitions</h3>
      {#each resources.eventDefinitions as eventDef}
        <div class="resource-item">
          <pre class="json-display">{JSON.stringify(eventDef, null, 2)}</pre>
        </div>
      {/each}
    </div>

    <!-- PlanDefinition -->
    <div class="section">
      <h3>PlanDefinition</h3>
      {#if resources.planDefinition}
        <pre class="json-display">{formatJson(resources.planDefinition)}</pre>
      {/if}
    </div>

    <!-- NEW: ActivityDefinition-Task Pairs -->
    <div class="section">
      <h3>Activities and Tasks</h3>
      {#if resources.activities}
        {#each resources.activities as activity}
          <div class="resource-pair">
            <div class="resource-pair-header">
              <h4>{activity.code.coding[0].display}</h4>
            </div>
            <div class="resource-pair-content">
              <div class="definition">
                <h5>ActivityDefinition</h5>
                <pre class="json-display">{formatJson(activity)}</pre>
              </div>
              {#if resources.tasks}
                {#each resources.tasks.filter(t => t.focus?.reference === `ActivityDefinition/${activity.id}`) as task}
                  <div class="task">
                    <h5>Task Instance</h5>
                    <pre class="json-display">{formatJson(task)}</pre>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- RequestGroup -->
    <div class="section">
      <h3>RequestGroup</h3>
      {#if resources.requestGroup}
        <pre class="json-display">{formatJson(resources.requestGroup)}</pre>
      {/if}
    </div>
  </div>
</div>

<style>
  .preview-pane {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
    font-family: monospace;
  }

  .preview-header {
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
    background-color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .update-button {
    padding: 0.5rem 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .update-button:hover {
    background-color: #2563eb;
  }

  .preview-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .json-display {
    padding: 1rem;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    overflow-x: auto;
    white-space: pre-wrap;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #334155;
    margin-bottom: 1rem;
  }

  .json-display:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .resource-pair {
    margin-bottom: 1.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .resource-pair-header {
    background-color: #f8fafc;
    padding: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .resource-pair-header h4 {
    margin: 0;
    font-size: 1rem;
    color: #1e293b;
  }

  .resource-pair-content {
    padding: 1rem;
    display: grid;
    gap: 1rem;
  }

  .definition, .task {
    background-color: white;
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
  }

  h5 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .resource-item {
    margin-bottom: 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
  }

</style>