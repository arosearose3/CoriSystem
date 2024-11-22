// routes/workflows/webhooks/+page.svelte
<script>
  import { onMount } from 'svelte';
  import { Webhook, Copy } from 'lucide-svelte';

  let webhooks = [];
  let selectedWebhook = null;

  onMount(async () => {
    webhooks = await fetchWebhooks();
  });

  function copyEndpoint(url) {
    navigator.clipboard.writeText(url);
    // Show toast notification
  }
</script>

<div class="p-4">
  <div class="flex justify-between mb-4">
    <h2 class="text-lg font-semibold">Webhook Endpoints</h2>
    <button class="px-4 py-2 bg-blue-500 text-white rounded">
      New Webhook
    </button>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="space-y-2">
      {#each webhooks as webhook}
        <div class="bg-white shadow rounded p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">{webhook.name}</h3>
            <button 
              class="text-gray-500 hover:text-gray-700"
              on:click={() => copyEndpoint(webhook.url)}
            >
              <Copy class="w-4 h-4" />
            </button>
          </div>
          <p class="text-sm text-gray-500 break-all">{webhook.url}</p>
          <div class="mt-2 flex items-center text-sm">
            <span class="text-gray-500 mr-2">Last triggered:</span>
            <span>{webhook.lastTriggered || 'Never'}</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="bg-white shadow rounded p-4">
      {#if selectedWebhook}
        <!-- Webhook details and history -->
      {:else}
        <div class="text-center text-gray-500">
          <Webhook class="w-12 h-12 mx-auto mb-2" />
          <p>Select a webhook to view details</p>
        </div>
      {/if}
    </div>
  </div>
</div>