<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { createWebhook, updateWebhook } from '$lib/webhookServices.js';

  export let webhook = {};
  let isEditMode = false;
  let resourcePreview = '';
  let showPayload = false;
  


  $: if (!isEditMode && formData.name && !formData.name.includes('-')) {
    formData.name = `${formData.name}-${generateRandomString(6)}`;
  }

    // Auto-generate address when name changes with full URL
    $: formData.address = formData.name ? 
    `http://cori.system/event/webhook/${formData.name}` : '';


  
  let formData = {
    resourceType: "Endpoint",
    text: {
      status: "generated",
      div: "<div xmlns='http://www.w3.org/1999/xhtml'>Generated Endpoint Resource</div>"
    },
    status: "active",
    connectionType: {
      system: "http://hl7.org/fhir/ValueSet/endpoint-connection-type",
      code: "hl7-fhir-rest",
      display: "FHIR REST"
    },
    name: "",
    nameplus: "",
    address: "",
    // Updated payload type structure
    payloadType: [{
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/endpoint-payload-type",
          code: "any",
          display: "Any"
        }
      ],
      text: "any"
    }],
    payloadMimeType: ["application/json"]
  };

  const dispatch = createEventDispatcher();

  onMount(() => {
    if (webhook && webhook.id) {
      isEditMode = true;
      formData = { 
        ...formData, 
        ...webhook,
        // Ensure these are always set correctly
        connectionType: {
          system: "http://hl7.org/fhir/ValueSet/endpoint-connection-type",
          code: "hl7-fhir-rest",
          display: "FHIR REST"
        },
        payloadType: [{
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/endpoint-payload-type",
              code: "any",
              display: "Any"
            }
          ],
          text: "any"
        }],
        payloadMimeType: ["application/json"]
      };
      showPayload = true;
    }
    resourcePreview = JSON.stringify(formData, null, 2);
  });

  function updateResourcePreview() {
    resourcePreview = JSON.stringify(formData, null, 2);
  }

  async function handleSubmit() {
    try {
      if (!isEditMode) {
        formData.address = `http://cori.system/event/webhook/${formData.name}`;
      }

      updateResourcePreview();
      
      if (isEditMode) {
        await updateWebhook(formData.id, formData);
      } else {
        await createWebhook(formData);
      }
      dispatch('save', { uniqueEndpointPath:formData.nameplus  });
    } catch (error) {
      console.error("Failed to submit webhook:", error);
      alert("Failed to submit webhook: " + error.message);
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4 p-4">
  {#if isEditMode}
    <div class="space-y-2">
      <label class="block font-medium">ID</label>
      <input 
        type="text" 
        bind:value={formData.id} 
        readonly 
        class="w-full p-2 bg-gray-100 rounded border"
      />
    </div>
  {/if}

  <div class="space-y-2">
    <label class="block font-medium">Name</label>
    <input 
      type="text" 
      bind:value={formData.name} 
      required 
      class="w-full p-2 rounded border"
    />
    {#if !isEditMode}
      <div class="text-sm text-gray-600">
        Generated Name Preview: {formData.name}
      </div>
    {/if}
  </div>

  <div class="space-y-2">
    <label class="block font-medium">Status</label>
    <select 
      bind:value={formData.status} 
      required 
      class="w-full p-2 rounded border"
    >
      <option value="active">Active</option>
      <option value="suspended">Suspended</option>
      <option value="error">Error</option>
      <option value="off">Off</option>
      <option value="entered-in-error">Entered in Error</option>
      <option value="test">Test</option>
    </select>
  </div>

  <div class="space-y-2">
    <label class="block font-medium">Connection Type</label>
    <input 
      type="text" 
      value="FHIR REST (hl7-fhir-rest)" 
      readonly 
      class="w-full p-2 bg-gray-100 rounded border"
    />
  </div>

  <div class="space-y-2">
    <label class="block font-medium">Address</label>
    <input 
      type="url" 
      value={formData.address}
      readonly 
      class="w-full p-2 bg-gray-100 rounded border font-mono text-sm"
    />
    <div class="text-sm text-gray-600">
      Auto-generated FHIR endpoint URL based on webhook name
    </div>
  </div>

  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <input 
        type="checkbox" 
        id="showPayload"
        bind:checked={showPayload} 
        class="w-4 h-4"
      />
      <label for="showPayload" class="font-medium">Show Payload Details</label>
    </div>
    {#if showPayload}
      <div class="ml-6 p-4 bg-gray-50 rounded border">
        <div class="text-sm space-y-2">
          <div>
            <span class="font-medium">Payload Type:</span> any
          </div>
          <div>
            <span class="font-medium">MIME Type:</span> application/json
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="block font-medium">Resource Preview:</label>
      <button 
        type="button" 
        class="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded flex items-center gap-1"
        on:click={updateResourcePreview}
      >
        <span class="transform inline-block">⟳</span> Refresh
      </button>
    </div>
    <textarea 
      readonly 
      class="w-full h-64 font-mono text-sm p-2 rounded border bg-gray-50"
    >{resourcePreview}</textarea>
  </div>

  <div class="flex gap-4 pt-4">
    <button 
      type="submit"
      on:click={handleSubmit}
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      {isEditMode ? 'Update' : 'Create'} Webhook
    </button>
    <button 
      type="button" 
      on:click={handleCancel}
      class="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
    >
      Cancel
    </button>
  </div>
</form>