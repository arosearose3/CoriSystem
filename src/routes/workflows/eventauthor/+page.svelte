<script>
import { nanoid } from 'nanoid';

const EVENT_TYPES = [
  { code: 'webhook', display: 'Custom Webhook' },
  { code: 'timer', display: 'Timer Event' },
  { code: 'fhirchange', display: 'FHIR Change Event' }
];

const FHIR_RESOURCES = [
  'Patient',
  'Practitioner',
  'Organization',
  'Encounter',
  'Observation',
  'Condition',
  'ServiceRequest',
  'Task',
  'Questionnaire',
  'QuestionnaireResponse'
];

let eventDef = {
  resourceType: 'EventDefinition',
  id: nanoid(),
  status: 'active',
  name: '',
  title: '',
  description: '',
  eventType: 'webhook',
  // For webhook
  webhookPath: '',
  payloadItems: [],
  // For timer
  pubsubMessage: '',
  // For FHIR change
  fhirResourceType: 'Patient'
};

// Generate webhook path on type selection
$: if (eventDef.eventType === 'webhook' && !eventDef.webhookPath) {
  eventDef.webhookPath = `api/webhook/${nanoid(8)}`;
}

// Add new payload item for webhook
function addPayloadItem() {
  eventDef.payloadItems = [
    ...eventDef.payloadItems,
    { name: '', value: '', id: nanoid() }
  ];
}

// Remove payload item
function removePayloadItem(id) {
  eventDef.payloadItems = eventDef.payloadItems.filter(item => item.id !== id);
}

// Generate RelatedArtifact outputs based on event type
$: eventOutputs = generateEventOutputs(eventDef);

function generateEventOutputs(def) {
  switch(def.eventType) {
    case 'webhook':
      return def.payloadItems.map(item => ({
        type: "derived-from",
        label: `${item.name}-req`,
        display: `Webhook payload: ${item.name}`,
        extension: [{
          url: "https://combinebh.org/fhir/event-mapping",
          extension: [{
            url: "path",
            valueString: `body.${item.name}`
          }]
        }]
      }));

    case 'timer':
      return [{
        type: "derived-from",
        label: "message-req",
        display: "Timer message payload",
        extension: [{
          url: "https://combinebh.org/fhir/event-mapping",
          extension: [{
            url: "path",
            valueString: "message.data"
          }]
        }]
      }];

    case 'fhirchange':
      return [
        {
          type: "derived-from",
          label: "action-req",
          display: "FHIR action type",
          extension: [{
            url: "https://combinebh.org/fhir/event-mapping",
            extension: [{
              url: "path",
              valueString: "message.attributes.action"
            }]
          }]
        },
        {
          type: "derived-from",
          label: "resource-req",
          display: "FHIR resource content",
          extension: [{
            url: "https://combinebh.org/fhir/event-mapping",
            extension: [{
              url: "path",
              valueString: "message.data"
            }]
          }]
        },
        {
          type: "derived-from",
          label: "versionId-req",
          display: "Resource version ID",
          extension: [{
            url: "https://combinebh.org/fhir/event-mapping",
            extension: [{
              url: "path",
              valueString: "message.attributes.versionId"
            }]
          }]
        }
      ];
  }
}
</script>

<div class="event-author p-4 max-w-2xl mx-auto">
  <h2 class="text-xl font-bold mb-4">Create Event Definition</h2>

  <!-- Basic Info -->
  <div class="mb-6 space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1" for="title">
        Event Title
      </label>
      <input
        type="text"
        id="title"
        bind:value={eventDef.title}
        class="w-full p-2 border rounded"
        placeholder="Human readable title"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="name">
        Event Name
      </label>
      <input
        type="text"
        id="name"
        bind:value={eventDef.name}
        class="w-full p-2 border rounded"
        placeholder="computer-friendly-name"
      />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="description">
        Description
      </label>
      <textarea
        id="description"
        bind:value={eventDef.description}
        class="w-full p-2 border rounded"
        rows="3"
      ></textarea>
    </div>
  </div>

  <!-- Event Type Selection -->
  <div class="mb-6">
    <label class="block text-sm font-medium mb-1" for="eventType">
      Event Type
    </label>
    <select
      id="eventType"
      bind:value={eventDef.eventType}
      class="w-full p-2 border rounded"
    >
      {#each EVENT_TYPES as type}
        <option value={type.code}>{type.display}</option>
      {/each}
    </select>
  </div>

  <!-- Type Specific Configuration -->
  {#if eventDef.eventType === 'webhook'}
    <div class="mb-6 space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">
          Webhook URL
        </label>
        <div class="bg-gray-100 p-2 rounded">
          {eventDef.webhookPath}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">
          Payload Items
        </label>
        {#each eventDef.payloadItems as item}
          <div class="flex gap-2 mb-2">
            <input
              type="text"
              bind:value={item.name}
              placeholder="Name"
              class="flex-1 p-2 border rounded"
            />
            <input
              type="text"
              bind:value={item.value}
              placeholder="Value"
              class="flex-1 p-2 border rounded"
            />
            <button
              on:click={() => removePayloadItem(item.id)}
              class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              ×
            </button>
          </div>
        {/each}
        <button
          on:click={addPayloadItem}
          class="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Payload Item
        </button>
      </div>
    </div>

  {:else if eventDef.eventType === 'timer'}
    <div class="mb-6">
      <label class="block text-sm font-medium mb-1" for="pubsubMessage">
        PubSub Message
      </label>
      <input
        type="text"
        id="pubsubMessage"
        bind:value={eventDef.pubsubMessage}
        class="w-full p-2 border rounded"
        placeholder="Message content"
      />
    </div>

  {:else if eventDef.eventType === 'fhirchange'}
    <div class="mb-6">
      <label class="block text-sm font-medium mb-1" for="resourceType">
        FHIR Resource Type
      </label>
      <select
        id="resourceType"
        bind:value={eventDef.fhirResourceType}
        class="w-full p-2 border rounded"
      >
        {#each FHIR_RESOURCES as resource}
          <option value={resource}>{resource}</option>
        {/each}
      </select>
    </div>
  {/if}

  <!-- Event Outputs Preview -->
  <div class="mt-8">
    <h3 class="text-lg font-medium mb-2">Event Outputs</h3>
    <div class="bg-gray-50 p-4 rounded border">
      {#each eventOutputs as output}
        <div class="mb-2 p-2 bg-white rounded shadow">
          <div class="font-medium">{output.label}</div>
          <div class="text-sm text-gray-600">{output.display}</div>
          <div class="text-xs text-gray-500">
            Path: {output.extension[0].extension[0].valueString}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Debug: Event Definition Preview -->
  <div class="mt-8">
    <h3 class="text-lg font-medium mb-2">Event Definition Preview</h3>
    <pre class="bg-gray-50 p-4 rounded border overflow-auto">
      {JSON.stringify({
        ...eventDef,
        relatedArtifact: eventOutputs
      }, null, 2)}
    </pre>
  </div>
</div>
