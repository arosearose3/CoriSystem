
<script>
  import { workflowStore } from '$lib/stores/workflow';

  let workflow;
  let resources = {
    serviceRequest: null,
    planDefinition: null,
    eventDefinitions: [],
    activities: [],
    tasks: [],
    requestGroup: null
  };

  $: {
    // Add console logging for debugging
    console.log('Workflow store updated:', $workflowStore);
    
    // Only regenerate if we have a valid workflow with nodes
    if ($workflowStore && Array.isArray($workflowStore.nodes)) {
      resources = generateFhirResources($workflowStore);
      console.log('Generated resources:', resources);
    }
  }

  function formatJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      console.error('Error formatting JSON:', error);
      return '{}';
    }
  }


  // CHANGED: Modified generateFhirResources function
  function generateFhirResources(workflow) {
    if (!workflow || !workflow.nodes) {
      console.warn('Invalid workflow data:', workflow);
      return resources; // Return existing resources if workflow is invalid
    }

    const newResources = {
      serviceRequest: {
        resourceType: "ServiceRequest",
        id: `sr-${Date.now()}`,
        status: "active",
        intent: "order",
        code: {
          coding: [{
            system: "http://example.org/service-types",
            code: "workflow",
            display: "Workflow Service"
          }]
        }
      },
      eventDefinitions: workflow.eventDefinitions || [],
      planDefinition: generatePlanDefinition(workflow),
      activities: generateActivityDefinitions(workflow),
      tasks: workflow.tasks || [],
      requestGroup: generateRequestGroup(workflow)
    };

    console.log('New resources generated:', newResources);
    return newResources;
  }

  // CHANGED: Modified generatePlanDefinition function
  function generatePlanDefinition(workflow) {
    const eventNodes = workflow.nodes.filter(n => n.type === 'event');
    const actions = buildActionChain(workflow, eventNodes);
    
    return {
      resourceType: "PlanDefinition",
      id: `plan-${Date.now()}`,
      status: "active",
      trigger: eventNodes.map(eventNode => ({
        type: "named-event",
        eventName: eventNode.data?.eventType || "fhir-resource-changed",
        eventDefinition: {
          reference: `EventDefinition/${eventNode.id}`
        }
      })),
      action: actions
    };
  }

  // CHANGED: Enhanced error handling in buildActionChain
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

      if (node.type === 'activity') {
        const action = {
          id: node.id,
          title: node.label || 'Unnamed Activity',
          definitionCanonical: `ActivityDefinition/${node.id}`
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
      .filter(n => n.type === 'activity')
      .map(node => ({
        resourceType: "ActivityDefinition",
        id: node.id,
        status: "active",
        kind: "Task",
        code: {
          coding: [{
            system: "http://example.org/activities",
            code: node.id,
            display: node.label
          }]
        }
      }));
  }

  // CHANGED: Enhanced generateRequestGroup function
  function generateRequestGroup(workflow) {
    if (!workflow.nodes || !workflow.edges) {
      return {
        resourceType: "RequestGroup",
        status: "active",
        intent: "order",
        action: []
      };
    }

    const actions = workflow.nodes
      .filter(n => n.type === 'activity')
      .map(node => {
        const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
        return {
          id: node.id,
          resource: {
            reference: `Task/task-${node.id}`
          },
          relatedAction: outgoingEdges.map(edge => ({
            actionId: edge.target,
            relationship: "before"
          }))
        };
      });

    return {
      resourceType: "RequestGroup",
      id: `rg-${Date.now()}`,
      status: "active",
      intent: "order",
      action: actions
    };
  }

  // CHANGED: Added explicit update function
  function handleUpdateClick() {
    console.log('Update button clicked');
    // Force regeneration of resources
    resources = generateFhirResources($workflowStore);
  }
</script>

<div class="preview-pane">
  <div class="preview-header">
    <h2>FHIR Resources</h2>
    <button class="update-button" on:click={handleUpdateClick}>
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