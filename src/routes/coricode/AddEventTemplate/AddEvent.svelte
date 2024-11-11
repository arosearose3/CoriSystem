<script>
    import TimerEvent from './TimerEvent.svelte';
    import WebhookEvent from './WebhookEvent.svelte';
    import DataChangeEvent from './DataChangeEvent.svelte';
    
    let selectedType = 'timer';
    let eventData = {};
    
    function handleSave(event) {
      eventData = event.detail;
      console.log('Saving event:', { type: selectedType, ...eventData });
      // Dispatch event to parent
      dispatch('eventAdded', { type: selectedType, ...eventData });
    }
  </script>
  
  <div class="container p-4">
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">Event Type</label>
      <select
        bind:value={selectedType}
        class="w-full p-2 border rounded-md"
      >
        <option value="timer">Timer</option>
        <option value="webhook">Webhook</option>
        <option value="dataChange">Data Change</option>
      </select>
    </div>
  
    <div class="mt-4">
      {#if selectedType === 'timer'}
        <TimerEvent on:save={handleSave} />
      {:else if selectedType === 'webhook'}
        <WebhookEvent on:save={handleSave} />
      {:else if selectedType === 'dataChange'}
        <DataChangeEvent on:save={handleSave} />
      {/if}
    </div>
  </div>
  