<!-- PlanBuilder.svelte -->
<script>
  let planName = '';
  let selectedTrigger = null;
  let selectedActions = [];
  let isSequential = true; // Whether actions should run in sequence

  // Available components loaded from FHIR store
  let availableTriggers = [];  // Timer, FHIR changes, Webhooks
  let availableActions = [];   // ActivityDefinitions

  onMount(async () => {
    // Load available triggers
    availableTriggers = [
      ...(await loadTimers()),
      ...(await loadFhirSubscriptions()),
      ...(await loadWebhooks())
    ];

    // Load available actions
    availableActions = await loadActivityDefinitions();
  });

  async function handleSave() {
    const planDef = {
      resourceType: "PlanDefinition",
      name: planName.toLowerCase().replace(/\s+/g, '-'),
      title: planName,
      status: "active",
      date: new Date().toISOString(),
      trigger: [formatTrigger(selectedTrigger)],
      action: selectedActions.map((action, index) => ({
        id: `${index + 1}`,
        title: action.title || action.name,
        definitionCanonical: `ActivityDefinition/${action.id}`,
        // Add relatedAction if sequential and not first action
        ...(isSequential && index > 0 ? {
          relatedAction: [{
            actionId: `${index}`,
            relationship: "after"
          }]
        } : {})
      }))
    };

    // Save to FHIR store
    await savePlanDefinition(planDef);
  }
</script>

<div class="grid grid-cols-3 gap-4">
  <!-- Left column: Available components -->
  <div class="border p-4">
    <h3 class="font-bold mb-4">Events</h3>
    <div class="event-list space-y-2">
      {#each availableTriggers as trigger}
        <div 
          class="p-2 border rounded hover:bg-gray-50 cursor-pointer"
          class:selected={selectedTrigger?.id === trigger.id}
          on:click={() => selectedTrigger = trigger}
        >
          <div class="font-medium">{trigger.name}</div>
          <div class="text-sm text-gray-500">{trigger.type}</div>
        </div>
      {/each}
    </div>

    <h3 class="font-bold mb-4 mt-6">Actions</h3>
    <div class="action-list space-y-2">
      {#each availableActions as action}
        <div 
          class="p-2 border rounded hover:bg-gray-50 cursor-pointer"
          class:selected={selectedActions.some(a => a.id === action.id)}
          on:click={() => toggleAction(action)}
        >
          <div class="font-medium">{action.title}</div>
          <div class="text-sm text-gray-500">{action.description}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Middle column: Plan builder -->
  <div class="border p-4">
    <h3 class="font-bold mb-4">Plan Configuration</h3>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">Plan Name</label>
      <input 
        type="text" 
        bind:value={planName}
        class="w-full p-2 border rounded"
        placeholder="Enter plan name"
      />
    </div>

    {#if selectedTrigger}
      <div class="mb-4">
        <h4 class="font-medium">Selected Trigger:</h4>
        <div class="p-2 bg-gray-50 rounded">
          {selectedTrigger.name}
        </div>
      </div>
    {/if}

    {#if selectedActions.length > 0}
      <div class="mb-4">
        <h4 class="font-medium">Selected Actions:</h4>
        <div class="space-y-2">
          {#each selectedActions as action}
            <div class="p-2 bg-gray-50 rounded flex justify-between">
              <span>{action.title}</span>
              <button 
                class="text-red-500"
                on:click={() => removeAction(action)}
              >
                Remove
              </button>
            </div>
          {/each}
        </div>
      </div>

      <label class="flex items-center mt-4">
        <input 
          type="checkbox" 
          bind:checked={isSequential}
          class="mr-2"
        />
        Run actions in sequence
      </label>
    {/if}

    <button
      class="mt-4 w-full py-2 bg-blue-500 text-white rounded"
      disabled={!canSave}
      on:click={handleSave}
    >
      Save Plan
    </button>
  </div>

  <!-- Right column: Preview -->
  <div class="border p-4">
    <h3 class="font-bold mb-4">Preview</h3>
    <pre class="bg-gray-50 p-2 rounded text-sm overflow-auto">
      {JSON.stringify(generatePreview(), null, 2)}
    </pre>
  </div>
</div>