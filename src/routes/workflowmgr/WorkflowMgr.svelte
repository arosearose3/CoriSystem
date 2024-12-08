<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; 

    
    // Enhanced state management
    let workflows = {
      available: [], // PlanDefinitions
      active: [],    // In-progress Tasks
      completed: [], // Completed Tasks
      failed: []     // Failed Tasks
    };
    
    let selectedWorkflow = null;
    let configurationTree = null;
    let loading = true;
    let error = null;
  
    let inputType = prop.type === 'string' ? 'text' : prop.type;

    // Fetch all workflow-related resources
    async function loadWorkflows() {
      try {

        // Load workflows and include referenced Basic Plans
        const planDefinitionsResponse = await fetch(`${base}/api/plandefinition/allbasicplansplus`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        workflows.available = planDefinitionsResponse.entry?.map(e => e.resource) || [];
  
        // Load all workflow Tasks with different statuses
        const taskStatuses = {
          active: ['in-progress', 'ready', 'received'],
          completed: ['completed'],
          failed: ['failed']
        };
  
        for (const [category, statuses] of Object.entries(taskStatuses)) {
          const tasksResponse = await callFhirApi('GET', '/Task', {
            params: {
              'code': 'workflow-controller',
              '_query': 'workflow-instances',
              'status': statuses,
              'organization': sessionStorage.getItem('organizationId'),
              '_include': ['Task:part-of'] // Include child tasks
            }
          });
          workflows[category] = tasksResponse.entry?.map(e => e.resource) || [];
        }
      } catch (e) {
        error = e.message;
      } finally {
        loading = false;
      }
    }
  
    // Build configuration tree when a workflow is selected
    async function selectWorkflow(planDefinition) {
      selectedWorkflow = planDefinition;
      configurationTree = await buildConfigurationTree(planDefinition);
    }
  
    // Recursively build the configuration tree
    async function buildConfigurationTree(planDefinition) {
      // Start with the Complex Plan
      const tree = {
        id: planDefinition.id,
        type: 'complex-plan',
        name: planDefinition.title || planDefinition.name,
        description: planDefinition.description,
        properties: extractInstanceTimeProperties(planDefinition),
        basicPlans: []
      };
  
      // Process each action (Basic Plan) in the Complex Plan
      for (const action of (planDefinition.action || [])) {
        if (action.definitionCanonical) {
          // Fetch the referenced Basic Plan
          const basicPlanId = action.definitionCanonical.split('/').pop();
          const basicPlan = await callFhirApi('GET', `/PlanDefinition/${basicPlanId}`);
          
          const basicPlanNode = {
            id: basicPlan.id,
            type: 'basic-plan',
            name: basicPlan.title || basicPlan.name,
            description: basicPlan.description,
            properties: extractInstanceTimeProperties(basicPlan),
            activities: []
          };
  
          // Process activities in the Basic Plan
          for (const activityAction of (basicPlan.action || [])) {
            if (activityAction.definitionCanonical) {
              // Fetch the referenced ActivityDefinition
              const activityId = activityAction.definitionCanonical.split('/').pop();
              const activity = await callFhirApi('GET', `/ActivityDefinition/${activityId}`);
              
              basicPlanNode.activities.push({
                id: activity.id,
                type: 'activity',
                name: activity.title || activity.name,
                description: activity.description,
                properties: extractInstanceTimeProperties(activity)
              });
            }
          }
  
          tree.basicPlans.push(basicPlanNode);
        }
      }
  
      return tree;
    }
  
    // Extract instance-time properties from any resource
    function extractInstanceTimeProperties(resource) {
      const properties = [];
      
      // Check resource-level properties
      if (resource.parameter) {
        properties.push(...resource.parameter
          .filter(param => param.timing === 'instance-time')
          .map(param => ({
            id: param.id,
            name: param.title || param.name,
            type: param.type,
            required: param.required || false,
            value: null,
            description: param.documentation
          })));
      }
  
      // Check action-level properties
      if (resource.action) {
        resource.action.forEach(action => {
          if (action.input) {
            properties.push(...action.input
              .filter(input => input.timing === 'instance-time')
              .map(input => ({
                id: input.id,
                name: input.title || input.name,
                type: input.type,
                required: input.required || false,
                value: null,
                description: input.documentation,
                actionId: action.id
              })));
          }
        });
      }
  
      return properties;
    }
  
    // Create Tasks for the entire workflow hierarchy
    async function activateWorkflow() {
      try {
        // Create the controller Task for the Complex Plan
        const controllerTask = {
          resourceType: 'Task',
          status: 'ready',
          intent: 'order',
          code: {
            coding: [{
              system: 'http://your-system/workflow-types',
              code: 'workflow-controller'
            }]
          },
          instantiatesCanonical: `PlanDefinition/${selectedWorkflow.id}`,
          for: {
            reference: `Organization/${sessionStorage.getItem('organizationId')}`
          },
          input: collectPropertiesForTask(configurationTree, 'complex-plan'),
          authoredOn: new Date().toISOString()
        };
  
        const savedController = await callFhirApi('POST', '/Task', controllerTask);
  
        // Create Tasks for each Basic Plan
        for (const basicPlan of configurationTree.basicPlans) {
          const basicPlanTask = {
            resourceType: 'Task',
            status: 'ready',
            intent: 'order',
            code: {
              coding: [{
                system: 'http://your-system/workflow-types',
                code: 'basic-plan'
              }]
            },
            instantiatesCanonical: `PlanDefinition/${basicPlan.id}`,
            partOf: {
              reference: `Task/${savedController.id}`
            },
            input: collectPropertiesForTask(basicPlan, 'basic-plan'),
            authoredOn: new Date().toISOString()
          };
  
          const savedBasicPlan = await callFhirApi('POST', '/Task', basicPlanTask);
  
          // Create Tasks for each Activity
          for (const activity of basicPlan.activities) {
            const activityTask = {
              resourceType: 'Task',
              status: 'ready',
              intent: 'order',
              code: {
                coding: [{
                  system: 'http://your-system/workflow-types',
                  code: 'activity'
                }]
              },
              instantiatesCanonical: `ActivityDefinition/${activity.id}`,
              partOf: {
                reference: `Task/${savedBasicPlan.id}`
              },
              input: collectPropertiesForTask(activity, 'activity'),
              authoredOn: new Date().toISOString()
            };
  
            await callFhirApi('POST', '/Task', activityTask);
          }
        }
  
        // Refresh the lists
        await loadWorkflows();
        
        // Clear selection
        selectedWorkflow = null;
        configurationTree = null;
      } catch (e) {
        error = e.message;
      }
    }
  
    function collectPropertiesForTask(node, level) {
      return node.properties
        .filter(prop => prop.value !== null)
        .map(prop => ({
          type: {
            coding: [{
              system: 'http://your-system/property-types',
              code: prop.id
            }]
          },
          valueString: prop.value,
          extension: [{
            url: 'http://your-system/property-level',
            valueString: level
          }]
        }));
    }
  
    onMount(loadWorkflows);
  </script>
  
  <div class="container mx-auto p-4">
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}
  
    <!-- Available Workflows Section -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Available Workflows</h2>
      {#if loading}
        <p>Loading workflows...</p>
      {:else}
        <div class="grid gap-4">
          {#each workflows.available as workflow}
            <button
              class="p-4 border rounded hover:bg-gray-50 text-left"
              class:bg-blue-50={selectedWorkflow?.id === workflow.id}
              on:click={() => selectWorkflow(workflow)}
            >
              <h3 class="font-bold">{workflow.title || workflow.name}</h3>
              <p class="text-gray-600">{workflow.description || 'No description available'}</p>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  
    <!-- Workflow Configuration Tree -->
    {#if configurationTree}
      <section class="mb-8 p-4 border rounded">
        <h3 class="text-xl font-bold mb-4">Configure Workflow: {configurationTree.name}</h3>
        
        <!-- Complex Plan Properties -->
        {#if configurationTree.properties.length > 0}
          <div class="mb-6">
            <h4 class="text-lg font-semibold mb-2">Workflow Level Properties</h4>
            {#each configurationTree.properties as prop}
              <div class="mb-4">
                <label class="block mb-2" for={prop.id}>
                  {prop.name}
                  {#if prop.required}<span class="text-red-500">*</span>{/if}
                </label>
                {#if prop.type === 'string'}
                <input
                    id={prop.id}
                    type="text"
                    class="w-full p-2 border rounded"
                    bind:value={prop.value}
                    required={prop.required}
                />
            {:else if prop.type === 'number'}
                <input
                    id={prop.id}
                    type="number"
                    class="w-full p-2 border rounded"
                    bind:value={prop.value}
                    required={prop.required}
                />
            {:else}
                <input
                    id={prop.id}
                    type="text"
                    class="w-full p-2 border rounded"
                    bind:value={prop.value}
                    required={prop.required}
                />
            {/if}
            
                {#if prop.description}
                  <p class="text-sm text-gray-600 mt-1">{prop.description}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
  
        <!-- Basic Plans -->
        {#each configurationTree.basicPlans as basicPlan}
          <div class="mb-6 pl-4 border-l-2 border-blue-200">
            <h4 class="text-lg font-semibold mb-2">{basicPlan.name}</h4>
            
            <!-- Basic Plan Properties -->
            {#if basicPlan.properties.length > 0}
              <div class="mb-4">
                <h5 class="text-md font-medium mb-2">Plan Properties</h5>
                {#each basicPlan.properties as prop}
                  <div class="mb-4">
                    <label class="block mb-2" for={`${basicPlan.id}-${prop.id}`}>
                      {prop.name}
                      {#if prop.required}<span class="text-red-500">*</span>{/if}
                    </label>
                    {#if prop.type === 'string'}
                    <input
                        id={`${basicPlan.id}-${prop.id}`}
                        type="text"
                        class="w-full p-2 border rounded"
                        bind:value={prop.value}
                        required={prop.required}
                    />
                {:else if prop.type === 'number'}
                    <input
                        id={`${basicPlan.id}-${prop.id}`}
                        type="number"
                        class="w-full p-2 border rounded"
                        bind:value={prop.value}
                        required={prop.required}
                    />
                {:else}
                    <input
                        id={`${basicPlan.id}-${prop.id}`}
                        type="text"
                        class="w-full p-2 border rounded"
                        bind:value={prop.value}
                        required={prop.required}
                    />
                {/if}
                
                  </div>
                {/each}
              </div>
            {/if}
  
            <!-- Activities -->
            {#each basicPlan.activities as activity}
              <div class="mb-4 pl-4 border-l-2 border-green-200">
                <h5 class="text-md font-medium mb-2">{activity.name}</h5>
                
                <!-- Activity Properties -->
                {#if activity.properties.length > 0}
                  <div class="mb-4">
                    {#each activity.properties as prop}
                      <div class="mb-4">
                        <label class="block mb-2" for={`${activity.id}-${prop.id}`}>
                          {prop.name}
                          {#if prop.required}<span class="text-red-500">*</span>{/if}
                        </label>
                        {#if prop.type === 'string'}
                        <input
                            id={`${activity.id}-${prop.id}`}
                            type="text"
                            class="w-full p-2 border rounded"
                            bind:value={prop.value}
                            required={prop.required}
                        />
                    {:else if prop.type === 'number'}
                        <input
                            id={`${activity.id}-${prop.id}`}
                            type="number"
                            class="w-full p-2 border rounded"
                            bind:value={prop.value}
                            required={prop.required}
                        />
                    {:else}
                        <input
                            id={`${activity.id}-${prop.id}`}
                            type="text"
                            class="w-full p-2 border rounded"
                            bind:value={prop.value}
                            required={prop.required}
                        />
                    {/if}
                    
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
  
        <button
          on:click={activateWorkflow}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Activate Workflow
        </button>
      </section>
    {/if}
  
    <!-- Active Workflows Section -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Running Workflows</h2>
      <div class="grid gap-4">
        {#each workflows.active as task}
          <div class="p-4 border rounded bg-blue-50">
            <h3 class="font-bold">{task.businessStatus?.text || 'Active Workflow'}</h3>
            <p class="text-sm text-gray-600">Started: {new Date(task.authoredOn).toLocaleString()}</p>
            <p class="text-sm text-gray-600">Status: {task.status}</p>
          </div>
        {/each}
      </div>
    </section>
  
    <!-- Completed Workflows Section -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Completed Workflows</h2>
      <div class="grid gap-4">
        {#each workflows.completed as task}
          <div class="p-4 border rounded bg-green-50">
            <h3 class="font-bold">{task.businessStatus?.text || 'Completed Workflow'}</h3>
            <p class="text-sm text-gray-600">Completed: {new Date(task.modifiedTime).toLocaleString()}</p>
          </div>
        {/each}
      </div>
    </section>

  <!-- Failed Workflows Section -->
  <section>
    <h2 class="text-2xl font-bold mb-4">Failed Workflows</h2>
    <div class="grid gap-4">
      {#each workflows.failed as task}
        <div class="p-4 border rounded bg-red-50">
          <h3 class="font-bold">{task.businessStatus?.text || 'Failed Workflow'}</h3>
          <div class="mt-2 space-y-2">
            <p class="text-sm text-gray-600">
              Failed: {new Date(task.modifiedTime).toLocaleString()}
            </p>
            <!-- Display the failure reason if available -->
            {#if task.statusReason}
              <p class="text-sm text-red-600">
                Reason: {task.statusReason.text}
              </p>
            {/if}
            <!-- Show any error details stored in output -->
            {#if task.output?.find(o => o.type.coding[0]?.code === 'error-details')}
              <div class="mt-2 p-3 bg-red-100 rounded text-sm">
                {task.output.find(o => o.type.coding[0]?.code === 'error-details').valueString}
              </div>
            {/if}
            <!-- Show child task status if this is a Complex Plan -->
            {#if task.contained}
              <div class="mt-3 pl-4 border-l-2 border-red-200">
                <h4 class="text-sm font-semibold mb-2">Affected Components:</h4>
                {#each task.contained as childTask}
                  <div class="text-sm mb-2">
                    <span class="font-medium">{childTask.businessStatus?.text || 'Component'}:</span>
                    <span class={childTask.status === 'failed' ? 'text-red-600' : 'text-gray-600'}>
                      {childTask.status}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
            <!-- Retry button for failed workflows -->
            <button
              class="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
              on:click={() => retryWorkflow(task)}
            >
              Retry Workflow
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Help section explaining the workflow hierarchy -->
  <section class="mt-12 p-6 bg-gray-50 rounded">
    <h2 class="text-xl font-bold mb-4">Understanding Workflow Structure</h2>
    <div class="space-y-4">
      <div>
        <h3 class="font-semibold mb-2">Complex Plan (Top Level)</h3>
        <p class="text-gray-700">
          The overall workflow container that orchestrates multiple Basic Plans.
          Properties set here affect the entire workflow execution.
        </p>
      </div>
      
      <div>
        <h3 class="font-semibold mb-2">Basic Plans (Middle Level)</h3>
        <p class="text-gray-700">
          Individual workflow components that can be reused across different Complex Plans.
          Each Basic Plan has its own configuration and can contain multiple Activities.
        </p>
      </div>
      
      <div>
        <h3 class="font-semibold mb-2">Activities (Bottom Level)</h3>
        <p class="text-gray-700">
          Specific actions or tasks that will be executed. Activities can have their own
          configuration properties and represent the actual work being performed.
        </p>
      </div>

      <div class="mt-6 p-4 bg-blue-50 rounded">
        <h3 class="font-semibold mb-2">Property Configuration</h3>
        <p class="text-gray-700">
          Properties marked as "instance-time" can be configured when activating a workflow.
          These properties can exist at any level (Complex Plan, Basic Plan, or Activity)
          and will be stored with the workflow instance for use during execution.
        </p>
      </div>
    </div>
  </section>
</div>
  <!-- Failed Workflows Section -->
  <section>
    <h2 class="text-2xl font-bold mb-4">Failed Workflows</h2>
    <div class="grid gap-4">
      {#each workflows.failed as task}
        <div class="p-4 border rounded bg-red-50">
          <h3 class="font-bold">{task.businessStatus?.text || 'Failed Workflow'}</h3>
          <div class="mt-2 space-y-2">
            <p class="text-sm text-gray-600">
              Failed: {new Date(task.modifiedTime).toLocaleString()}
            </p>
            <!-- Display the failure reason if available -->
            {#if task.statusReason}
              <p class="text-sm text-red-600">
                Reason: {task.statusReason.text}
              </p>
            {/if}
            <!-- Show any error details stored in output -->
            {#if task.output?.find(o => o.type.coding[0]?.code === 'error-details')}
              <div class="mt-2 p-3 bg-red-100 rounded text-sm">
                {task.output.find(o => o.type.coding[0]?.code === 'error-details').valueString}
              </div>
            {/if}
            <!-- Show child task status if this is a Complex Plan -->
            {#if task.contained}
              <div class="mt-3 pl-4 border-l-2 border-red-200">
                <h4 class="text-sm font-semibold mb-2">Affected Components:</h4>
                {#each task.contained as childTask}
                  <div class="text-sm mb-2">
                    <span class="font-medium">{childTask.businessStatus?.text || 'Component'}:</span>
                    <span class={childTask.status === 'failed' ? 'text-red-600' : 'text-gray-600'}>
                      {childTask.status}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
            <!-- Retry button for failed workflows -->
            <button
              class="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
              on:click={() => retryWorkflow(task)}
            >
              Retry Workflow
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Help section explaining the workflow hierarchy -->
  <section class="mt-12 p-6 bg-gray-50 rounded">
    <h2 class="text-xl font-bold mb-4">Understanding Workflow Structure</h2>
    <div class="space-y-4">
      <div>
        <h3 class="font-semibold mb-2">Complex Plan (Top Level)</h3>
        <p class="text-gray-700">
          The overall workflow container that orchestrates multiple Basic Plans.
          Properties set here affect the entire workflow execution.
        </p>
      </div>
      
      <div>
        <h3 class="font-semibold mb-2">Basic Plans (Middle Level)</h3>
        <p class="text-gray-700">
          Individual workflow components that can be reused across different Complex Plans.
          Each Basic Plan has its own configuration and can contain multiple Activities.
        </p>
      </div>
      
      <div>
        <h3 class="font-semibold mb-2">Activities (Bottom Level)</h3>
        <p class="text-gray-700">
          Specific actions or tasks that will be executed. Activities can have their own
          configuration properties and represent the actual work being performed.
        </p>
      </div>

      <div class="mt-6 p-4 bg-blue-50 rounded">
        <h3 class="font-semibold mb-2">Property Configuration</h3>
        <p class="text-gray-700">
          Properties marked as "instance-time" can be configured when activating a workflow.
          These properties can exist at any level (Complex Plan, Basic Plan, or Activity)
          and will be stored with the workflow instance for use during execution.
        </p>
      </div>
    </div>
  </section>




<style>
    /* Visual hierarchy for nested workflow levels */
    .workflow-level {
      border-left: 2px solid #e5e7eb;
      margin-left: 1rem;
      padding-left: 1rem;
    }
  
    /* Base input styling */
    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
    }
  
    input:focus {
      outline: 2px solid #3b82f6;
      border-color: #3b82f6;
    }
  
    input:hover {
      border-color: #9ca3af;
    }
  
    /* Required field indicator */
    .required-field label::after {
      content: "*";
      color: #ef4444;
      margin-left: 0.25rem;
    }
  
    /* Status indicators */
    .status-active {
      border-left: 4px solid #3b82f6;
    }
  
    .status-completed {
      border-left: 4px solid #10b981;
    }
  
    .status-failed {
      border-left: 4px solid #ef4444;
    }
  
    /* Interactive element transitions */
    button:not(:disabled) {
      transition: background-color 0.2s;
    }
  
    /* Nested content structure */
    .nested-content {
      margin-left: 1rem;
      padding-left: 1rem;
      border-left: 2px solid #e5e7eb;
    }
  </style>