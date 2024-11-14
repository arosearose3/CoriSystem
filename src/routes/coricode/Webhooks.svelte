<script>
    import { onMount } from 'svelte';
    import AddEditWebhook from './EditAddWebhook.svelte';
    import { getAllWebhooks, deleteWebhook } from '$lib/webhookServices.js';
  
    let webhooks = [];
    let loading = true;
    let error = null;
    let selectedWebhook = null;
    let showAddWebhook = false;

    let endpointNames = []; // Replace with your actual endpoint names
 

    async function loadWebhooks() {
        try {
            loading = true;
            const fetchedWebhooks = await getAllWebhooks();

            // Check if the response is a valid bundle with webhooks
            if (fetchedWebhooks && fetchedWebhooks.resourceType === 'Bundle' && fetchedWebhooks.entry) {
                webhooks = fetchedWebhooks.entry.map(entry => entry.resource);
                endpointNames = webhooks.map(webhook => webhook.name + '-' + webhook.id.slice(-6));
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
  
    function handleWebhookSaved() {
      if (endpointNames.includes(uniqueEndpointPath)) {
      alert('Endpoint name already exists. Please choose a different name.');
      return;
    }

      loadWebhooks(); // Reload webhooks after a webhook is saved
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
                <th class="px-6 py-3 text-left">Connection Type</th>
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
                  <td class="px-6 py-4">{webhook.connectionType?.coding[0]?.code}</td>
                  <td class="px-6 py-4 text-right">
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
  