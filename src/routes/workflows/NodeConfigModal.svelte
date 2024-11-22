<script>
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import { Check, X } from 'lucide-svelte';
  
    const dispatch = createEventDispatcher();
  
    export let node;
    export let show = false;
  
    let config = { ...node.data };
  
    function handleSave() {
      dispatch('save', { nodeId: node.id, config });
      show = false;
    }
  
    function handleClose() {
      show = false;
    }
  
    $: validationErrors = validateConfig(node.type, config);
  </script>
  
  {#if show}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      transition:fade
    >
      <div class="bg-white rounded-lg shadow-xl w-[500px]">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold">Configure {node.type}</h3>
          <button
            class="p-1 hover:bg-gray-100 rounded"
            on:click={handleClose}
          >
            <X class="w-5 h-5" />
          </button>
        </div>
  
        <div class="p-4">
          {#if node.type === 'webhook'}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Webhook URL</label>
                <input
                  type="text"
                  bind:value={config.url}
                  class="w-full border rounded px-3 py-2"
                  placeholder="https://"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Method</label>
                <select
                  bind:value={config.method}
                  class="w-full border rounded px-3 py-2"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Headers</label>
                {#each config.headers || [] as header, i}
                  <div class="flex space-x-2 mb-2">
                    <input
                      type="text"
                      bind:value={header.key}
                      placeholder="Key"
                      class="border rounded px-2 py-1 w-1/3"
                    />
                    <input
                      type="text"
                      bind:value={header.value}
                      placeholder="Value"
                      class="border rounded px-2 py-1 w-2/3"
                    />
                    <button
                      class="text-red-500"
                      on:click={() => config.headers.splice(i, 1)}
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                {/each}
                <button
                  class="text-blue-500 text-sm"
                  on:click={() => config.headers = [...(config.headers || []), { key: '', value: '' }]}
                >
                  + Add Header
                </button>
              </div>
            </div>
          {/if}
  
          {#if node.type === 'timer'}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Schedule (Cron)</label>
                <input
                  type="text"
                  bind:value={config.schedule}
                  class="w-full border rounded px-3 py-2"
                  placeholder="*/5 * * * *"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Use cron syntax: minute hour day month weekday
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Timezone</label>
                <select
                  bind:value={config.timezone}
                  class="w-full border rounded px-3 py-2"
                >
                  <option value="UTC">UTC</option>
                  <option value="local">Local</option>
                </select>
              </div>
            </div>
          {/if}
  
          {#if node.type === 'condition'}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Expression</label>
                <textarea
                  bind:value={config.expression}
                  class="w-full border rounded px-3 py-2"
                  rows="3"
                  placeholder="Task.status === 'completed'"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  bind:value={config.description}
                  class="w-full border rounded px-3 py-2"
                  placeholder="Describe what this condition checks"
                />
              </div>
            </div>
          {/if}
  
          <!-- Validation Errors -->
          {#if validationErrors.length > 0}
            <div class="mt-4 p-3 bg-red-50 rounded text-red-700 text-sm">
              <ul class="list-disc list-inside">
                {#each validationErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
  
        <div class="flex justify-end space-x-2 p-4 border-t">
          <button
            class="px-4 py-2 border rounded hover:bg-gray-50"
            on:click={handleClose}
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            on:click={handleSave}
            disabled={validationErrors.length > 0}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}