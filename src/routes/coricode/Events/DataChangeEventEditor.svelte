<script>
    import { createEventDispatcher } from 'svelte';
    import axios from 'axios';
  
    export let event = null;
  
    const dispatch = createEventDispatcher();
    
    const RESOURCE_TYPES = [
      'Patient',
      'Practitioner',
      'ServiceRequest',
      'Appointment',
      'Organization',
      'Observation'
    ];
  
    const OPERATIONS = [
      'create',
      'update',
      'delete'
    ];
  
    let form = {
      name: '',
      description: '',
      resourceType: '',
      operation: '',
      filters: ''
    };
  
    $: if (event) {
      form = {
        name: event.name,
        description: event.description || '',
        resourceType: event.resourceType,
        operation: event.operation,
        filters: event.filters === 'None' ? '' : event.filters
      };
    }
  
    async function handleSubmit() {
  try {
    const eventTemplate = {
      resourceType: "Basic",
/*       meta: {
        profile: [
          "https://combinebh.org/fhir/StructureDefinition/event-template" // Simplified canonical URL
        ]
      }, */
      text: {
        status: "generated",
        div: `<div xmlns="http://www.w3.org/1999/xhtml">
          <p>Event Template: ${form.name}</p>
          <p>Type: ${form.type || 'data-changed'}</p>
          <p>Resource Type: ${form.resourceType}</p>
          <p>Operation: ${form.operation}</p>
          <p>Description: ${form.description || 'No description provided'}</p>
        </div>`
      },
      code: {
        coding: [{
          system: "http://combinebh.org/fhir/event-types",
          code: "event-template"
        }]
      },
      extension: [{
        url: "http://combinebh.org/fhir/event-template",
        extension: [
          {
            url: "name",
            valueString: form.name
          },
          {
            url: "description",
            valueString: form.description || ''
          },
          {
            url: "type",
            valueString: "data-changed"
          },
          {
            url: "resourceType",
            valueString: form.resourceType
          },
          {
            url: "operation",
            valueString: form.operation
          }
        ]
      }]
    };

    // Add filters if specified
    if (form.filters) {
      eventTemplate.extension[0].extension.push({
        url: "filters",
        valueString: form.filters
      });
    }

    // Send to server
    const response = await fetch('/api/templates/events/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventTemplate)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create event template');
    }

    const result = await response.json();
    // Handle success (e.g., show notification, redirect, etc.)
    
  } catch (error) {
    console.error('Error creating event template:', error);
    // Handle error (e.g., show error message)
  }
}
    function handleCancel() {
      dispatch('cancel');
    }
  </script>
  
  <div class="container mx-auto p-4 max-w-2xl">
    <h2 class="text-2xl font-bold mb-6">
      {event ? 'Edit' : 'Create'} Data Change Event
    </h2>
  
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Name
          <input
            type="text"
            bind:value={form.name}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., New Client Created"
          />
        </label>
      </div>
  
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Description
          <textarea
            bind:value={form.description}
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Describe when this event should trigger..."
          />
        </label>
      </div>
  
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Resource Type
          <select
            bind:value={form.resourceType}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">Select a resource type...</option>
            {#each RESOURCE_TYPES as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </label>
      </div>
  
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Operation
          <select
            bind:value={form.operation}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">Select an operation...</option>
            {#each OPERATIONS as op}
              <option value={op}>{op}</option>
            {/each}
          </select>
        </label>
      </div>
  
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Filters (optional)
          <input
            type="text"
            bind:value={form.filters}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., status=active&category=referral"
          />
          <p class="mt-1 text-sm text-gray-500">
            Enter filters in URL query format (e.g., key=value&key2=value2)
          </p>
        </label>
      </div>
  
      <div class="flex justify-end space-x-4">
        <button
          type="button"
          on:click={handleCancel}
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          {event ? 'Update' : 'Create'} Event
        </button>
      </div>
    </form>
  </div>