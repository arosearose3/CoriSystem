<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; 
  
    // State management for our component
    let basicWorkflows = [];
    let selectedWorkflows = new Set();
    let executionMode = 'sequential';
    let payloadValue = '';
    let complexWorkflowPreview = '';
    let loading = true;
    let error = null;
  

    const FHIR_BASE_URL = "https://healthcare.googleapis.com/v1/projects/combine-fhir-smart-store/locations/us-central1/datasets/COMBINE-FHIR-v1/fhirStores/1/fhir";


    // Load available Basic Workflows on component mount
    onMount(async () => {
        try {
        const response = await fetch(`${base}/api/plandefinition/allbasicplans`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        basicWorkflows = response.entry?.map(e => e.resource) || [];
        loading = false;
      } catch (e) {
        error = e.message;
        loading = false;
      }
    });

 

  
    // Generate the Complex Workflow PlanDefinition
    function generateComplexWorkflow() {
      // Create actions array for our selected workflows
      const actions = Array.from(selectedWorkflows).map((workflowId, index) => {
        const action = {
          id: `action-${index}`,
          definitionCanonical: `PlanDefinition/${workflowId}`,
          input: [{
            // This input will be available to all Basic Plans
            name: 'payload',
            type: 'string',
            documentation: 'Shared payload for all workflows'
          }]
        };
  
        // For sequential execution, add relationships except for first action
        if (executionMode === 'sequential' && index > 0) {
          action.relatedAction = [{
            actionId: `action-${index - 1}`,
            relationship: 'after'
          }];
        }
  
        return action;
      });
  
      // Create the Complex Workflow PlanDefinition
      const complexWorkflow = {
        resourceType: 'PlanDefinition',
        status: 'draft',
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/plan-definition-type',
            code: 'workflow-definition'
          }]
        },
        name: 'complex_workflow_' + new Date().getTime(),
        title: `Complex Workflow (${executionMode})`,
        description: `Complex workflow executing ${selectedWorkflows.size} basic workflows in ${executionMode} mode`,
        action: actions
      };
  
      // Update the preview
      complexWorkflowPreview = JSON.stringify(complexWorkflow, null, 2);
      return complexWorkflow;
    }
  
    // Handle checkbox changes
    function handleWorkflowSelection(workflowId) {
      if (selectedWorkflows.has(workflowId)) {
        selectedWorkflows.delete(workflowId);
      } else {
        selectedWorkflows.add(workflowId);
      }
      selectedWorkflows = selectedWorkflows; // Trigger reactivity
      if (selectedWorkflows.size > 0) {
        generateComplexWorkflow();
      } else {
        complexWorkflowPreview = '';
      }
    }
  
    // Handle execution mode changes
    function handleExecutionModeChange() {
      if (selectedWorkflows.size > 0) {
        generateComplexWorkflow();
      }
    }
  
    // Handle payload value changes
    function handlePayloadChange() {
      if (selectedWorkflows.size > 0) {
        generateComplexWorkflow();
      }
    }
  
    // Save the Complex Workflow
    async function saveComplexWorkflow() {
      try {
        error = null;
        const workflow = generateComplexWorkflow();

        const response = await fetch(`${base}/api/plandefinition/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body:workflow
        });

        if (!response.ok) {
          throw new Error(`Failed to save workflow: ${response.statusText}`);
        }

        alert('Complex workflow saved successfully!');
      } catch (e) {
        error = `Failed to save workflow: ${e.message}`;
      }
    }
  </script>
  
  <div class="container mx-4 my-4">
    {#if error}
      <div class="p-4 mb-4 bg-red-100 text-red-700 rounded">
        {error}
      </div>
    {/if}
  
    <div class="grid grid-cols-2 gap-4">
      <!-- Left Column: Selection Controls -->
      <div class="border p-4 rounded">
        <h2 class="text-xl font-bold mb-4">Create Complex Workflow</h2>
        
        <!-- Execution Mode Selection -->
        <div class="mb-6">
          <h3 class="font-semibold mb-2">Execution Mode</h3>
          <div class="flex space-x-4">
            <label>
              <input
                type="radio"
                bind:group={executionMode}
                value="sequential"
                on:change={handleExecutionModeChange}
              >
              Sequential (In Order)
            </label>
            <label>
              <input
                type="radio"
                bind:group={executionMode}
                value="parallel"
                on:change={handleExecutionModeChange}
              >
              Parallel (All at Once)
            </label>
          </div>
        </div>
  
        <!-- Payload Input -->
        <div class="mb-6">
          <h3 class="font-semibold mb-2">Payload Value</h3>
          <input
            type="text"
            bind:value={payloadValue}
            on:input={handlePayloadChange}
            placeholder="Enter payload value"
            class="w-full p-2 border rounded"
          >
        </div>
  
        <!-- Basic Workflow Selection -->
        <h3 class="font-semibold mb-2">Select Basic Workflows</h3>
        {#if loading}
          <p>Loading workflows...</p>
        {:else}
          <div class="space-y-2">
            {#each basicWorkflows as workflow}
              <label class="flex items-start space-x-2">
                <input
                  type="checkbox"
                  on:change={() => handleWorkflowSelection(workflow.id)}
                >
                <div>
                  <span class="font-medium">{workflow.title || workflow.name}</span>
                  {#if workflow.description}
                    <p class="text-sm text-gray-600">{workflow.description}</p>
                  {/if}
                </div>
              </label>
            {/each}
          </div>
        {/if}
  
        <!-- Save Button -->
        <button
          class="mt-6 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          on:click={saveComplexWorkflow}
          disabled={selectedWorkflows.size === 0}
        >
          Save Complex Workflow
        </button>
      </div>
  
      <!-- Right Column: Preview -->
      <div class="border p-4 rounded">
        <h2 class="text-xl font-bold mb-4">Preview</h2>
        {#if complexWorkflowPreview}
          <pre class="bg-gray-50 p-4 rounded overflow-auto max-h-[600px]">
            {complexWorkflowPreview}
          </pre>
        {:else}
          <p class="text-gray-600">
            Select basic workflows to generate a preview of the complex workflow.
          </p>
        {/if}
      </div>
    </div>
  </div>