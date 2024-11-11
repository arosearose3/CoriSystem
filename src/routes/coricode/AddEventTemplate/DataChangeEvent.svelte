<script>
  import { createEventDispatcher } from 'svelte';
  import { base } from '$app/paths';

  const dispatch = createEventDispatcher();
  
  let resourceType = '';
  let criteria = '';
  let subscriptionName = '';
  let payloadContent = 'application/fhir+json';
  let saving = false;
  let error = null;
  
  const resourceTypes = [
    'Patient',
    'Practitioner',
    'Organization',
    'Observation',
    'Condition',
    'Procedure',
    'MedicationRequest',
    'Appointment',
    'ServiceRequest'
  ];

    // Reactive subscription preview
    $: subscriptionPreview = {
    resourceType: 'Subscription',
    status: 'requested',
    reason: subscriptionName || undefined,
    criteria: criteria || (resourceType ? `${resourceType}?_count=1` : undefined),
    channel: {
      type: 'rest-hook',
      endpoint: '${base}/event',
      payload: payloadContent
    }
  };

    // Remove undefined properties for preview
    $: cleanSubscriptionPreview = JSON.stringify(
    JSON.parse(JSON.stringify(subscriptionPreview)),
    null, 
    2
  );


  
  async function handleSave() {
  if (!isValid) return;

  saving = true;
  error = null;

  const subscriptionData = {
    resourceType: 'Subscription',
    status: 'OFF',
    reason: subscriptionName,
    criteria: criteria || `${resourceType}?_count=1`,
    channel: {
      type: 'rest-hook',
      endpoint: '${base}/event',
      payload: payloadContent
    }
  };

  try {
    const response = await fetch('/api/subscription/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    const contentType = response.headers.get('content-type');
    let errorData;

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        // Handle structured error response
        if (data.error) {
          throw new Error(data.error + (data.details ? `: ${JSON.stringify(data.details)}` : ''));
        } else {
          throw new Error('Failed to create subscription');
        }
      }

      // Success case
      dispatch('save', data.data);
      dispatch('eventAdded');
    } else {
      // Handle non-JSON response
      const textResponse = await response.text();
      throw new Error(`Server returned invalid response: ${textResponse}`);
    }

  } catch (err) {
    console.error('Error creating subscription:', err);
    error = err.message;
    
    // Show error in UI
    if (document.getElementById('error-message')) {
      document.getElementById('error-message').scrollIntoView({ behavior: 'smooth' });
    }
  } finally {
    saving = false;
  }
}

  // Basic validation
  $: isValid = subscriptionName && resourceType;
</script>

{#if error}
  <div 
    id="error-message" 
    class="bg-red-50 border-l-4 border-red-400 p-4 mb-4" 
    role="alert"
  >
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm text-red-700">
          {error}
        </p>
      </div>
    </div>
  </div>
{/if}

<div class="space-y-4">
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {error}</span>
    </div>
  {/if}

  <div>
    <label class="block text-sm font-medium mb-2">
      Subscription Name*
      <span class="text-red-500">*</span>
    </label>
    <input
      type="text"
      bind:value={subscriptionName}
      placeholder="Enter a name for this subscription"
      class="w-full p-2 border rounded-md"
      disabled={saving}
    />
    {#if subscriptionName === ''}
      <p class="text-sm text-red-500 mt-1">
        Subscription name is required
      </p>
    {/if}
  </div>

  <div>
    <label class="block text-sm font-medium mb-2">
      Resource Type
      <span class="text-red-500">*</span>
    </label>
    <select
      bind:value={resourceType}
      class="w-full p-2 border rounded-md"
      disabled={saving}
    >
      <option value="">Select a resource type</option>
      {#each resourceTypes as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
    {#if resourceType === ''}
      <p class="text-sm text-red-500 mt-1">
        Resource type is required
      </p>
    {/if}
  </div>

  <div>
    <label class="block text-sm font-medium mb-2">Search Criteria</label>
    <input
      type="text"
      bind:value={criteria}
      placeholder={resourceType ? `${resourceType}?[parameters]` : 'Select a resource type first'}
      class="w-full p-2 border rounded-md"
      disabled={!resourceType || saving}
    />
    <p class="text-sm text-gray-500 mt-1">
      Example: Patient?_lastUpdated=gt2023-01-01
    </p>
  </div>

  <div>
    <label class="block text-sm font-medium mb-2">Channel Configuration</label>
    <div class="bg-gray-50 p-3 rounded-md">
      <div class="flex items-center">
        <span class="font-medium mr-2">Type:</span>
        <span class="text-gray-600">rest-hook</span>
      </div>
      <div class="flex items-center mt-2">
        <span class="font-medium mr-2">Endpoint:</span>
        <span class="text-gray-600">${base}/event</span>
      </div>
    </div>
  </div>

  <div>
    <label class="block text-sm font-medium mb-2">Payload Format</label>
    <select
      bind:value={payloadContent}
      class="w-full p-2 border rounded-md"
      disabled={saving}
    >
      <option value="application/fhir+json">FHIR JSON</option>
      <option value="application/fhir+xml">FHIR XML</option>
      <option value="application/json">JSON</option>
    </select>
  </div>

  <div class="pt-4">
    <button
      on:click={handleSave}
      disabled={!isValid || saving}
      class="w-full px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
    >
      {#if saving}
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating Subscription...
      {:else}
        Save Data Change Event
      {/if}
    </button>
    {#if !isValid}
      <p class="text-sm text-red-500 mt-1 text-center">
        Please fill in all required fields
      </p>
    {/if}
  </div>
</div>

  <!-- Preview section -->
<div class="mt-8 border-t pt-4">
  <div class="flex items-center justify-between mb-2">
    <label class="block text-sm font-medium">Preview: Subscription Resource</label>
    <span class="text-xs text-gray-500">Updates in real-time</span>
  </div>
  
  <div class="relative">
    <pre
      class="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono text-gray-800 border border-gray-200 shadow-sm"
    >{cleanSubscriptionPreview}</pre>
    
    <!-- Optional: Add a copy button -->
    <button
      class="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 bg-white rounded border shadow-sm"
      on:click={() => {
        navigator.clipboard.writeText(cleanSubscriptionPreview);
        // Optional: Add toast notification for copy success
      }}
      title="Copy to clipboard"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  </div>
</div>

<style>


  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 400px;
    overflow-y: auto;
  }

  /* Add syntax highlighting styles */
  :global(.json-string) { color: #22863a; }
  :global(.json-number) { color: #005cc5; }
  :global(.json-boolean) { color: #005cc5; }
  :global(.json-null) { color: #005cc5; }
  :global(.json-key) { color: #24292e; }

  /* Custom scrollbar for preview */
  pre::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  pre::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  pre::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  pre::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
</style>