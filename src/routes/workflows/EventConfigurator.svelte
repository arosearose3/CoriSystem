<script>
    import { createEventDispatcher } from 'svelte';
    
    export let eventType;
    const dispatch = createEventDispatcher();
  
    let config = getDefaultConfig(eventType);
  
    function getDefaultConfig(type) {
      switch(type) {
        case 'webhook':
          return {
            url: '',
            method: 'POST',
            headers: []
          };
        case 'timer':
          return {
            schedule: '0 0 * * *',
            timezone: 'UTC'
          };
        case 'fhir-change':
          return {
            resourceType: '',
            operation: 'create'
          };
        default:
          return {};
      }
    }
  
    function updateConfig(key, value) {
      config = { ...config, [key]: value };
      dispatch('update', { config });
    }
  
    function generateEventDefinition() {
      const eventDef = {
        resourceType: "EventDefinition",
        status: "active",
        trigger: [{
          type: eventType,
          ...getEventSpecificTrigger(eventType, config)
        }]
      };
      dispatch('generate', { eventDef });
    }
  
    function getEventSpecificTrigger(type, config) {
      switch(type) {
        case 'webhook':
          return {
            name: 'webhook-trigger',
            data: [{
              type: { code: 'webhook' },
              endpoint: config.url
            }]
          };
        // ... other event types
      }
    }
  </script>
  
  <div class="p-4 border rounded">
    <h3 class="text-lg font-semibold mb-4">Configure {eventType} Event</h3>
  
    {#if eventType === 'webhook'}
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">URL</label>
          <input 
            type="text" 
            class="w-full p-2 border rounded"
            bind:value={config.url}
            on:input={(e) => updateConfig('url', e.target.value)}
          />
        </div>
  
        <div>
          <label class="block text-sm font-medium mb-1">Method</label>
          <select 
            class="w-full p-2 border rounded"
            bind:value={config.method}
            on:change={(e) => updateConfig('method', e.target.value)}
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
          </select>
        </div>
      </div>
    {/if}
  
    <button 
      class="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      on:click={generateEventDefinition}
    >
      Generate Event Definition
    </button>
  </div>