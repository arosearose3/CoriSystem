// components/testing/WorkflowSimulator.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import Play from 'lucide-svelte/icons/play';
  import Pause from 'lucide-svelte/icons/pause';
  import RotateCw from 'lucide-svelte/icons/rotate-cw';
  import AlertCircle from 'lucide-svelte/icons/circle-alert';

  import { workflowStore } from '$lib/stores/workflow';
  
  const dispatch = createEventDispatcher();
  
  let selectedWorkflow = null;
  let simulationSpeed = 1;
  let isRunning = false;
  let currentStep = null;
  let events = [];
  let errorInjection = false;

  // Test event configuration
  let testEvents = [
    {
      id: 'webhook-1',
      type: 'webhook',
      enabled: true,
      payload: {
        type: 'referral',
        data: {
          patientId: '123',
          serviceType: 'housing'
        }
      }
    },
    {
      id: 'timer-1',
      type: 'timer',
      enabled: true,
      schedule: '*/5 * * * *'
    },
    {
      id: 'fhir-change-1',
      type: 'fhir-change',
      enabled: true,
      resource: 'QuestionnaireResponse',
      operation: 'create'
    }
  ];

  async function startSimulation() {
    isRunning = true;
    events = [];
    
    try {
      for (const event of testEvents.filter(e => e.enabled)) {
        currentStep = event;
        
        // Simulate event trigger
        const result = await simulateEvent(event);
        events = [...events, result];
        
        // Pause between events based on simulation speed
        await new Promise(r => setTimeout(r, 1000 / simulationSpeed));
      }
      
      dispatch('complete', { events });
    } catch (error) {
      events = [...events, { 
        type: 'error', 
        error: error.message,
        timestamp: new Date()
      }];
    } finally {
      isRunning = false;
      currentStep = null;
    }
  }

  async function simulateEvent(event) {
    const startTime = Date.now();
    
    // Inject random error if enabled
    if (errorInjection && Math.random() < 0.2) {
      throw new Error('Simulated random error');
    }

    // Simulate event processing
    const result = {
      id: `sim-${Date.now()}`,
      type: event.type,
      timestamp: new Date(),
      duration: 0,
      status: 'completed',
      details: {}
    };

    switch (event.type) {
      case 'webhook':
        result.details = await simulateWebhook(event.payload);
        break;
      case 'timer':
        result.details = await simulateTimer(event.schedule);
        break;
      case 'fhir-change':
        result.details = await simulateFhirChange(event.resource, event.operation);
        break;
    }

    result.duration = Date.now() - startTime;
    return result;
  }
</script>

<div class="bg-white rounded-lg shadow p-4">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold">Workflow Simulator</h2>
    <div class="flex items-center space-x-2">
      <select 
        bind:value={simulationSpeed}
        class="border rounded px-2 py-1"
      >
        <option value={0.5}>0.5x Speed</option>
        <option value={1}>1x Speed</option>
        <option value={2}>2x Speed</option>
      </select>
      
      <button 
        class="p-2 rounded hover:bg-gray-100"
        on:click={() => errorInjection = !errorInjection}
        class:text-red-500={errorInjection}
      >
        <AlertCircle />
      </button>
    </div>
  </div>

  <div class="space-y-4 mb-4">
    {#each testEvents as event}
      <div class="border rounded p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <input
              type="checkbox"
              bind:checked={event.enabled}
              class="mr-2"
            />
            <span class="font-medium">{event.type}</span>
          </div>
          <span class="text-sm text-gray-500">ID: {event.id}</span>
        </div>

        {#if event.type === 'webhook'}
          <textarea
            bind:value={event.payload}
            class="w-full border rounded p-2 text-sm font-mono"
            rows="3"
          />
        {/if}

        {#if event.type === 'timer'}
          <input
            type="text"
            bind:value={event.schedule}
            class="border rounded px-2 py-1"
            placeholder="Cron schedule"
          />
        {/if}

        {#if event.type === 'fhir-change'}
          <div class="flex space-x-2">
            <input
              type="text"
              bind:value={event.resource}
              class="border rounded px-2 py-1"
              placeholder="Resource type"
            />
            <select
              bind:value={event.operation}
              class="border rounded px-2 py-1"
            >
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="flex justify-between items-center">
    <button
      class="px-4 py-2 bg-blue-500 text-white rounded flex items-center"
      on:click={startSimulation}
      disabled={isRunning}
    >
      {#if isRunning}
        <Pause class="w-4 h-4 mr-2" />
        Running...
      {:else}
        <Play class="w-4 h-4 mr-2" />
        Start Simulation
      {/if}
    </button>

    <button
      class="px-4 py-2 border rounded flex items-center"
      on:click={() => events = []}
    >
      <RotateCw class="w-4 h-4 mr-2" />
      Reset
    </button>
  </div>

  {#if currentStep}
    <div class="mt-4 p-3 bg-blue-50 rounded">
      <div class="text-sm">
        <span class="font-medium">Current Step:</span>
        {currentStep.type}
      </div>
    </div>
  {/if}
</div>