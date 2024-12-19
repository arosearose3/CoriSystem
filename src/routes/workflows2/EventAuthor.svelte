<script>
    import { nanoid } from 'nanoid';
    import FhirpathConditionBuilder from './fhirpath/FhirpathConditionBuilder.svelte';
    
    // Core type definitions
    const EVENT_TYPES = [
     { code: 'webhook', display: 'Custom Webhook', description: 'HTTP webhook endpoint that receives JSON payloads' },
     { code: 'timer', display: 'Timer Event', description: 'Scheduled events using Cloud Scheduler' },
     { code: 'fhirchange', display: 'FHIR Change Event', description: 'FHIR resource change notifications' }
    ];
    
    const TIMING_UNITS = [
     { code: 's', display: 'Seconds' },
     { code: 'min', display: 'Minutes' },
     { code: 'h', display: 'Hours' },
     { code: 'd', display: 'Days' }
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
    
 
    
    const OUTPUT_TIMINGS = [
      { code: 'author', display: 'Author Time' },
      { code: 'instance', display: 'Instance Time' },
      { code: 'execute', display: 'Execute Time' }
    ];

    const FHIR_BASE_URL = 'http://hl7.org/fhir/StructureDefinition';

    const OUTPUT_TYPES = {
      string: `${FHIR_BASE_URL}/string`,
      number: `${FHIR_BASE_URL}/decimal`,
      boolean: `${FHIR_BASE_URL}/boolean`,
      reference: `${FHIR_BASE_URL}/Reference`,
      dateTime: `${FHIR_BASE_URL}/dateTime`,
      code: `${FHIR_BASE_URL}/code`,
      object: `${FHIR_BASE_URL}/BackboneElement`
    };

    const FHIR_RESOURCES_MAP = {
      Patient: `${FHIR_BASE_URL}/Patient`,
      Practitioner: `${FHIR_BASE_URL}/Practitioner`,
      Organization: `${FHIR_BASE_URL}/Organization`,
      Encounter: `${FHIR_BASE_URL}/Encounter`,
      Observation: `${FHIR_BASE_URL}/Observation`,
      Condition: `${FHIR_BASE_URL}/Condition`,
      ServiceRequest: `${FHIR_BASE_URL}/ServiceRequest`,
      Task: `${FHIR_BASE_URL}/Task`,
      Questionnaire: `${FHIR_BASE_URL}/Questionnaire`,
      QuestionnaireResponse: `${FHIR_BASE_URL}/QuestionnaireResponse`
    };

    const defaultTimerConfig = {
      type: 'periodic', // or 'datetime' for one-time
      dateTime: '', // for one-time events
      repeat: {
        frequency: 1,
        period: 1,
        periodUnit: 'd',
        dayOfWeek: [],
        timeOfDay: [],
        dayOfMonth: [],
        monthOfYear: []
      }
    }

    const DAYS_OF_WEEK = [
      {code: 'mon', display: 'Monday'},
      {code: 'tue', display: 'Tuesday'},
      {code: 'wed', display: 'Wednesday'},
      {code: 'thu', display: 'Thursday'},
      {code: 'fri', display: 'Friday'},
      {code: 'sat', display: 'Saturday'},
      {code: 'sun', display: 'Sunday'}
    ];

    const MONTHS = Array(12).fill(0).map((_, i) => ({
      code: i + 1,
      display: new Date(2024, i, 1).toLocaleString('default', { month: 'long' })
    }));

    // Default configurations


    let saveStatus = '';
    let isSaving = false;

    let showConditionBuilder = false;
    let eventCondition = '';


    
    // Event Definition state
    let eventDef = {
      resourceType: 'EventDefinition',
      status: 'draft',
      name: '',
      title: '',
      description: '',
      eventType: 'webhook',
      condition: "",
      // CHANGE: Simplified configs to focus on outputs
      webhookConfig: {
        path: `api/webhook/${nanoid(8)}`,
        payloadItems: [] // Each item will have: name, type, required, timing
      },
      timerConfig: {
        frequency: 1,
        period: 1,
        periodUnit: 'd'
      },
      fhirConfig: {
        resourceType: 'Patient',
        action: 'all'
      }
    };


    // Trigger generation
  function getTriggerType(eventType) {
     switch(eventType) {
       case 'webhook':
         return 'named-event';
       case 'timer':
         return 'periodic';
       case 'fhirchange':
         return 'data-changed';
       default:
         return 'named-event';
     }
    }
    
    function generateTrigger(def) {
  switch (def.eventType) {
    case 'webhook': {
      // For named events like webhooks, we create a simple trigger with an optional condition
      const trigger = {
        type: "named-event",
        name: def.webhookConfig.path
      };

      // Add condition if one exists, using proper FHIR structure
      if (def.condition) {
        trigger.condition = {
          language: "text/fhirpath",
          expression: def.condition
        };
      }
      return [trigger];
    }

    case 'timer': {
      // For one-time scheduled events
      if (def.timerConfig.type === 'datetime') {
        const trigger = {
          type: "periodic",
          timingDateTime: def.timerConfig.dateTime
        };

        // Even scheduled events can have conditions
        if (def.condition) {
          trigger.condition = {
            language: "text/fhirpath",
            expression: def.condition
          };
        }
        return [trigger];
      }

      // For recurring events, we use the timing structure
      const trigger = {
        type: "periodic",
        timingTiming: {
          repeat: {
            frequency: def.timerConfig.repeat.frequency,
            period: def.timerConfig.repeat.period,
            periodUnit: def.timerConfig.repeat.periodUnit
          }
        }
      };

      // Add optional timing elements for complex schedules
      if (def.timerConfig.repeat.dayOfWeek?.length) {
        trigger.timingTiming.repeat.dayOfWeek = def.timerConfig.repeat.dayOfWeek;
      }
      if (def.timerConfig.repeat.timeOfDay?.length) {
        trigger.timingTiming.repeat.timeOfDay = def.timerConfig.repeat.timeOfDay;
      }
      if (def.timerConfig.repeat.dayOfMonth?.length) {
        trigger.timingTiming.repeat.dayOfMonth = def.timerConfig.repeat.dayOfMonth;
      }

      // Add condition if one exists
      if (def.condition) {
        trigger.condition = {
          language: "text/fhirpath",
          expression: def.condition
        };
      }
      return [trigger];
    }

    case 'fhirchange': {
      // For FHIR resource changes, we specify what data we're watching
      const trigger = {
        type: "data-changed",
        data: [{
          type: def.fhirConfig.resourceType,
          profile: [`http://hl7.org/fhir/StructureDefinition/${def.fhirConfig.resourceType}`]
        }]
      };

      // Add condition if one exists
      if (def.condition) {
        trigger.condition = {
          language: "text/fhirpath",
          expression: def.condition
        };
      }
      return [trigger];
    }

    default:
      throw new Error(`Unsupported eventType: ${def.eventType}`);
  }
}
    
    // Event handlers

    
    function addPayloadItem() {
  eventDef.webhookConfig.payloadItems = [
    ...eventDef.webhookConfig.payloadItems,
    createPayloadItem()
  ];
}
    
    function removePayloadItem(id) {
     eventDef.webhookConfig.payloadItems = eventDef.webhookConfig.payloadItems
       .filter(item => item.id !== id);
    }
    
    async function handleSave() {
      try {
        isSaving = true;
        saveStatus = 'Saving...';
        
        const response = await fetch('/api/eventdefinition/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalEventDefinition)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        saveStatus = 'Saved successfully!';
        setTimeout(() => {
          saveStatus = '';
        }, 3000);
      } catch (error) {
        console.error('Save failed:', error);
        saveStatus = `Error saving: ${error.message}`;
      } finally {
        isSaving = false;
      }
    }

    function createPayloadItem() {
        return {
          id: nanoid(),
          name: '',
          type: 'string',
          required: true,
          timing: 'instance', // Default to instance time
          description: ''
        };
      }

function generateOutputs(def) {
        switch(def.eventType) {
          case 'webhook':
            return def.webhookConfig.payloadItems.map(item => ({
              type: "documentation",
              label: `${item.name}${item.required ? '-req' : '-opt'}`,
              display: item.description || `Webhook payload: ${item.name}`,
              resource: OUTPUT_TYPES[item.type],
              citation: `Available at ${item.timing} time`
            }));

          case 'timer':
            return [{
              type: "documentation",
              label: "timestamp-req",
              display: "Timer Execution Time",
              resource: OUTPUT_TYPES.dateTime,
              citation: "Available at execution time"
            }];

          case 'fhirchange':
            return [
              {
                type: "documentation",
                label: `${def.fhirConfig.resourceType.toLowerCase()}-req`,
                display: `Changed ${def.fhirConfig.resourceType}`,
                resource: FHIR_RESOURCES_MAP[def.fhirConfig.resourceType],
                citation: "Available at execution time"
              },
              {
                type: "documentation",
                label: "action-req",
                display: "Change Action Type",
                resource: OUTPUT_TYPES.code,
                citation: "Available at execution time"
              }
            ];
        }
      }

function cleanFhirObject(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanFhirObject(item))
      .filter(item => item != null);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanFhirObject(value);
      if (cleanedValue != null && cleanedValue !== '' && 
          !(Array.isArray(cleanedValue) && cleanedValue.length === 0)) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length ? cleaned : null;
  }
  
  return obj;
}


$: finalEventDefinition = cleanFhirObject({
  resourceType: 'EventDefinition',
  status: eventDef.status,
  name: eventDef.name,
  title: eventDef.title,
  description: eventDef.description,
  trigger: generateTrigger(eventDef),
  relatedArtifact: generateOutputs(eventDef)
});
    </script>
  
  <div class="event-editor p-4 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Event Definition</h2>
   
    <!-- Basic Information -->
    <section class="mb-8 bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Basic Information</h3>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium mb-1" for="name">
            Name *
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
          <label class="block text-sm font-medium mb-1" for="title">
            Title *
          </label>
          <input 
            type="text"
            id="title"
            bind:value={eventDef.title}
            class="w-full p-2 border rounded"
            placeholder="Human-friendly title"
          />
        </div>
      </div>
   
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1" for="description">
          Description
        </label>
        <textarea
          id="description"
          bind:value={eventDef.description}
          class="w-full p-2 border rounded"
          rows="3"
          placeholder="Describe the purpose of this event"
        ></textarea>
      </div>
   
      <div>
        <label class="block text-sm font-medium mb-1" for="eventType">
          Event Type *
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
        <p class="text-sm text-gray-600 mt-1">
          {EVENT_TYPES.find(t => t.code === eventDef.eventType)?.description}
        </p>
      </div>
    </section>
   
    <!-- Event Configuration -->
    <section class="mb-8 bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Event Configuration</h3>
   
      {#if eventDef.eventType === 'webhook'}
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">
            Webhook Path
          </label>
          <div class="bg-gray-50 p-2 rounded border font-mono text-sm">
            {eventDef.webhookConfig.path}
          </div>
        </div>
   
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">
            Payload Items
          </label>
          {#each eventDef.webhookConfig.payloadItems as item}
            <div class="flex gap-2 mb-2">
              <input
                type="text"
                bind:value={item.name}
                placeholder="Property name"
                class="flex-1 p-2 border rounded"
              />
              <select
                bind:value={item.type}
                class="w-32 p-2 border rounded"
              >
                {#each Object.entries(OUTPUT_TYPES) as [key, url]}
                  <option value={key}>{key}</option>
                {/each}
              </select>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={item.required}
                  class="mr-2"
                />
                Required
              </label>
              <button
                on:click={() => removePayloadItem(item.id)}
                class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >×</button>
            </div>
          {/each}
          <button
            on:click={addPayloadItem}
            class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Payload Item
          </button>
        </div>
   
      {:else if eventDef.eventType === 'timer'}
      <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1">
        Timer Type
      </label>
      <select
        bind:value={eventDef.timerConfig.type}
        class="w-full p-2 border rounded"
      >
        <option value="periodic">Recurring</option>
        <option value="datetime">One-time</option>
      </select>
    </div>

    {#if eventDef.timerConfig.type === 'datetime'}
      <div>
        <label class="block text-sm font-medium mb-1">
          Schedule Date/Time
        </label>
        <input
          type="datetime-local"
          bind:value={eventDef.timerConfig.dateTime}
          class="w-full p-2 border rounded"
        />
      </div>

    {:else}
      <!-- Simple Periodic Section -->
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">
            Every X Units
          </label>
          <input
            type="number"
            bind:value={eventDef.timerConfig.repeat.frequency}
            min="1"
            class="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            Period
          </label>
          <input
            type="number"
            bind:value={eventDef.timerConfig.repeat.period}
            min="1"
            class="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            Unit
          </label>
          <select
            bind:value={eventDef.timerConfig.repeat.periodUnit}
            class="w-full p-2 border rounded"
          >
            {#each TIMING_UNITS as unit}
              <option value={unit.code}>{unit.display}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Days of Week -->
      <div>
        <label class="block text-sm font-medium mb-1">
          Days of Week (optional)
        </label>
        <div class="flex flex-wrap gap-2">
          {#each DAYS_OF_WEEK as day}
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:group={eventDef.timerConfig.repeat.dayOfWeek}
                value={day.code}
                class="mr-1"
              />
              {day.display}
            </label>
          {/each}
        </div>
      </div>

      <!-- Times of Day -->
      <div>
        <label class="block text-sm font-medium mb-1">
          Times of Day
        </label>
        <div class="flex items-center gap-2">
          <input
            type="time"
            class="p-2 border rounded"
            on:change={(e) => {
              if (e.target.value && !eventDef.timerConfig.repeat.timeOfDay.includes(e.target.value)) {
                eventDef.timerConfig.repeat.timeOfDay = [
                  ...eventDef.timerConfig.repeat.timeOfDay,
                  e.target.value
                ];
              }
            }}
          />
          <div class="flex gap-1">
            {#each eventDef.timerConfig.repeat.timeOfDay as time}
              <div class="flex items-center bg-gray-100 px-2 py-1 rounded">
                {time}
                <button
                  class="ml-1 text-red-500"
                  on:click={() => {
                    eventDef.timerConfig.repeat.timeOfDay = 
                      eventDef.timerConfig.repeat.timeOfDay.filter(t => t !== time);
                  }}
                >×</button>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
   
      {:else if eventDef.eventType === 'fhirchange'}
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">
              Resource Type
            </label>
            <select
              bind:value={eventDef.fhirConfig.resourceType}
              class="w-full p-2 border rounded"
            >
              {#each FHIR_RESOURCES as resource}
                <option value={resource}>{resource}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Change Action
            </label>
            <select
              bind:value={eventDef.fhirConfig.action}
              class="w-full p-2 border rounded"
            >
              <option value="all">All Changes</option>
              <option value="create">Create Only</option>
              <option value="update">Update Only</option>
              <option value="delete">Delete Only</option>
            </select>
          </div>
        </div>
      {/if}
    </section>
   
<!-- Outputs Section -->
<section class="mb-8 bg-white p-6 rounded-lg shadow">
  <h3 class="text-lg font-semibold mb-4">Event Outputs</h3>

  {#if eventDef.eventType === 'webhook'}
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">
        Payload Items
      </label>
      {#each eventDef.webhookConfig.payloadItems as item}
        <div class="flex gap-2 mb-2">
          <input
            type="text"
            bind:value={item.name}
            placeholder="Property name"
            class="flex-1 p-2 border rounded"
          />
          <select
            bind:value={item.type}
            class="w-32 p-2 border rounded"
          >
            {#each Object.entries(OUTPUT_TYPES) as [key, value]}
              <option value={key}>{value}</option>
            {/each}
          </select>
          <select
            bind:value={item.timing}
            class="w-40 p-2 border rounded"
          >
            {#each OUTPUT_TIMINGS as timing}
              <option value={timing.code}>{timing.display}</option>
            {/each}
          </select>
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={item.required}
              class="mr-2"
            />
            Required
          </label>
          <button
            on:click={() => removePayloadItem(item.id)}
            class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >×</button>
        </div>
        <input
          type="text"
          bind:value={item.description}
          placeholder="Description (optional)"
          class="w-full p-2 border rounded mt-1 mb-3"
        />
      {/each}
      <button
        on:click={addPayloadItem}
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Payload Item
      </button>
    </div>

  {:else}
    <div class="bg-gray-50 p-4 rounded">
      <h4 class="font-medium mb-2">Available Outputs</h4>
      {#each generateOutputs(eventDef) as output}
        <div class="mb-2 p-2 bg-white rounded shadow">
          <div class="font-medium">{output.label}</div>
          <div class="text-sm text-gray-600">{output.display}</div>
          <div class="text-xs text-gray-500">
            Type: {output.resource.split('/').pop()}, 
            {output.citation}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<!--new conditions config -->

<section class="mb-8 bg-white p-6 rounded-lg shadow">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold">Event Trigger Condition</h3>
    <button
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={() => showConditionBuilder = true}
    >
      Edit Condition
    </button>
  </div>

  {#if eventDef.condition}
    <div class="bg-gray-50 p-4 rounded">
      <code class="text-sm">{eventDef.condition}</code>
    </div>
  {:else}
    <p class="text-gray-500 italic">No condition set - event will always trigger</p>
  {/if}
</section>

<!-- ADD - condition builder modal -->
{#if showConditionBuilder}
    <FhirpathConditionBuilder 
      standalone={true}  
      condition={eventDef.condition}
      on:change={(e) => {
        console.log('Received condition:', e.detail.condition);
        eventDef.condition = e.detail.condition;
        showConditionBuilder = false;
      }}
      onClose={() => showConditionBuilder = false}
    />
{/if}


   
    <!-- Preview -->
<!-- Update preview section to show outputs -->
<section class="bg-white p-6 rounded-lg shadow">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold">EventDefinition Preview</h3>
    <div class="flex items-center gap-4">
      {#if saveStatus}
        <p class={`text-sm ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
          {saveStatus}
        </p>
      {/if}
      <button
        on:click={handleSave}
        disabled={isSaving}
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
  <pre class="bg-gray-50 p-4 rounded overflow-auto text-sm">
    {JSON.stringify(finalEventDefinition, null, 2)}
  </pre>
</section>
   </div>
  
   <style>
    .event-editor {
      font-family: system-ui, -apple-system, sans-serif;
    }
   
    .event-editor input[type="text"],
    .event-editor input[type="number"],
    .event-editor input[type="time"],
    .event-editor select,
    .event-editor textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      transition: border-color 0.15s ease-in-out;
    }
   
    .event-editor input:focus,
    .event-editor select:focus,
    .event-editor textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
   
    .event-editor select[multiple] {
      min-height: 8rem;
    }
   
    .event-editor button {
      font-weight: 500;
      transition: all 0.15s ease-in-out;
    }
   
    .event-editor button:hover {
      transform: translateY(-1px);
    }
   
    .event-editor button:active {
      transform: translateY(0);
    }
   
    .event-editor pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
   
    .event-editor .shadow {
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
   
    .event-editor .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
   
    .event-editor label {
      user-select: none;
    }
   
    .event-editor .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
   
    .event-editor input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;
      border: 1px solid #e2e8f0;
      cursor: pointer;
    }
   
    .event-editor section {
      transition: box-shadow 0.15s ease-in-out;
    }
   
    .event-editor section:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
   
    .event-editor .help-text {
      color: #64748b;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
   
    .event-editor .property-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem;
      background-color: #f8fafc;
      border-radius: 0.375rem;
      margin-bottom: 0.5rem;
    }
   
    .event-editor .remove-btn {
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      border: none;
      background-color: #ef4444;
      color: white;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }
   
    .event-editor .remove-btn:hover {
      background-color: #dc2626;
    }
   </style>
  
   