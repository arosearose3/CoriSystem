<script>
    import { onMount } from 'svelte';
    import AddEditWebhook from './EditAddWebhook.svelte';
    import { getAllWebhooks, deleteWebhook } from '$lib/webhookServices.js';
    import axios from 'axios';

    let webhooks = [];
    let loading = true;
    let error = null;
    let selectedWebhook = null;
    let showAddWebhook = false;
    let testResults = new Map();
    let endpointNames = [];
 

    async function testWebhook(webhook) {
    const webhookId = webhook.id;
    testResults.set(webhookId, { status: 'testing' });
    testResults = testResults;

    try {
        const webhookUrl = `https://localhost:3001/events/webhook/${webhook.name}`;
        const response = await axios.post(webhookUrl, 
    {
        test: true,
        timestamp: new Date().toISOString()
    },
    {
        headers: {
            'Content-Type': 'application/json'
        }
    }
);
        testResults.set(webhookId, { 
            status: 'success',
            statusCode: response.status,
            testedUrl: webhookUrl
        });
    } catch (error) {
        testResults.set(webhookId, { 
            status: 'error',
            message: error.message,
            testedUrl: webhookUrl
        });
    }
    testResults = testResults;
}

    async function loadWebhooks() {
    try {
        loading = true;
        const response = await getAllWebhooks();
        
        if (response?.resourceType === 'Bundle' && Array.isArray(response?.entry)) {
            webhooks = response.entry
                .filter(entry => entry?.resource?.resourceType === 'Endpoint')
                .map(entry => entry.resource);
                endpointNames = webhooks.filter(webhook => webhook?.name).map(webhook => webhook.name);
        } else {
            webhooks = [];
            endpointNames = [];
        }
    } catch (error) {
        console.error("Failed to load webhooks:", error);
        error = "Failed to load webhooks: " + error.message;
    } finally {
        loading = false;
    }
}
  
    async function handleDelete(webhookId, webhookName) {
      if (!confirm(`Are you sure you want to delete webhook "${webhookName}"?`)) return;
  
      try {
        await deleteWebhook(webhookId);
        await loadWebhooks();
      } catch (e) {
        alert('Failed to delete webhook: ' + e.message);
      }
    }
  
    function handleAddWebhook() {
      selectedWebhook = null;
      showAddWebhook = true;
    }
  
    function handleEdit(webhook) {
      selectedWebhook = webhook;
      showAddWebhook = true;
    }
  
    async function handleWebhookSaved(event) {
       const { uniqueEndpointPath } = event.detail;
       if (endpointNames.includes(uniqueEndpointPath)) {
           alert('Endpoint name already exists. Please choose a different name.');
           return;
       }
       await loadWebhooks();
       showAddWebhook = false;
   }

  
    function handleCancel() {
      selectedWebhook = null;
      showAddWebhook = false;
    }
  
    onMount(loadWebhooks);

    function handleSelectWebhook(webhook) {
    selectedWebhook = webhook;
    showAddWebhook = true; // Open EditAddWebhook component for editing
  }

  </script>
  
  {#if !showAddWebhook}
  <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Webhooks</h2>
          <button
              on:click={handleAddWebhook}
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
              Add Webhook
          </button>
      </div>

      {#if loading}
          <div class="text-center py-4">Loading webhooks...</div>
      {:else if error}
          <div class="text-red-500 py-4">{error}</div>
      {:else if webhooks.length === 0}
          <div class="text-center py-4 text-gray-500">No webhooks found</div>
      {:else}
      <div class="overflow-x-auto">
          <table class="min-w-full bg-white">
              <thead>
                  <tr class="bg-gray-100">
                      <th class="px-6 py-3 text-left">Name</th>
                      <th class="px-6 py-3 text-left">Address</th>
                      <th class="px-6 py-3 text-left">Status</th>
                      <th class="px-6 py-3 text-left">Test Result</th>
                      <th class="px-6 py-3 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody>
                  {#each webhooks as webhook}
                      <tr class="border-b hover:bg-gray-50">
                          <td 
                              class="px-6 py-4 transition-all hover:font-bold cursor-pointer"
                              on:click={() => handleEdit(webhook)}
                          >
                              {webhook.name}
                          </td>
                          <td class="px-6 py-4">{webhook.address}</td>
                          <td class="px-6 py-4">{webhook.status}</td>
                          <td class="px-6 py-4">
                              {#if testResults.get(webhook.id)}
                                  {#if testResults.get(webhook.id).status === 'testing'}
                                      <span class="text-yellow-500">Testing...</span>
                                  {:else if testResults.get(webhook.id).status === 'success'}
                                      <span class="text-green-500">
                                          Success ({testResults.get(webhook.id).statusCode})
                                      </span>
                                  {:else}
                                      <span class="text-red-500">
                                          {testResults.get(webhook.id).message}
                                      </span>
                                  {/if}
                              {/if}
                          </td>
                          <td class="px-6 py-4 text-right space-x-2">
                              <button
                                  on:click={() => testWebhook(webhook)}
                                  class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                              >
                                  Test
                              </button>
                              <button
                                  on:click={() => handleDelete(webhook.id, webhook.name)}
                                  class="text-red-500 hover:text-red-700"
                              >
                                  Delete
                              </button>
                          </td>
                      </tr>
                  {/each}
              </tbody>
          </table>
      </div>
      {/if}
  </div>
  {:else}
  <AddEditWebhook 
  webhook={selectedWebhook || {}} 
  on:save={handleWebhookSaved} 
  on:cancel={handleCancel} 
/>
  {/if}
  