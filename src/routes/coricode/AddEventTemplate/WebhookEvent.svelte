<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    
    let webhookName = '';
    let webhookDescription = '';
    
    function handleSave() {
      dispatch('save', {
        name: webhookName,
        description: webhookDescription,
        type: 'webhook'
      });
    }
  </script>
  
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-2">Webhook Name</label>
      <input
        type="text"
        bind:value={webhookName}
        placeholder="Enter webhook name"
        class="w-full p-2 border rounded-md"
      />
    </div>
  
    <div>
      <label class="block text-sm font-medium mb-2">Description</label>
      <textarea
        bind:value={webhookDescription}
        placeholder="Enter webhook description"
        class="w-full p-2 border rounded-md"
        rows="3"
      ></textarea>
    </div>
  
    <button
      on:click={handleSave}
      disabled={!webhookName}
      class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
    >
      Save Webhook Event
    </button>
  </div>