<script>
    import { nanoid } from 'nanoid';
    
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
    
    const CONDITION_TYPES = [
     { 
       code: 'fhirpath', 
       display: 'FHIRPath Expression',
       contexts: ['fhirchange'],
       inputType: 'expression',
       validation: (expr) => expr.includes('.')
     },
     { 
       code: 'user', 
       display: 'User Context',
       contexts: ['webhook', 'fhirchange', 'timer'],
       inputType: 'context',
       validation: (expr) => expr.startsWith('user.')
     },
     {
       code: 'time',
       display: 'Time Window',
       contexts: ['webhook', 'timer'],
       inputType: 'timewindow',
       validation: (expr) => true
     },
     {
       code: 'data',
       display: 'Data Validation',
       contexts: ['webhook', 'fhirchange'],
       inputType: 'schema',
       validation: (expr) => true
     }
    ];
    
    const OUTPUT_TIMINGS = [
      { code: 'author', display: 'Author Time' },
      { code: 'instance', display: 'Instance Time' },
      { code: 'execute', display: 'Execute Time' }
    ];

    // CHANGE: Output type mapping
    const OUTPUT_TYPES = {
      string: 'string',
      number: 'decimal',
      boolean: 'boolean',
      reference: 'Reference',
      dateTime: 'dateTime',
      code: 'code',
      object: 'BackboneElement'
    };


    // Default configurations
    const defaultConditionConfigs = {
     fhirpath: {
       expression: '',
       description: ''
     },
     user: {
       roles: [],
       organizations: [],
       permissions: []
     },
     time: {
       days: [],
       startTime: '',
       endTime: '',
       timezone: 'UTC'
     },
     data: {
       schema: {},
       required: []
     }
    };

    let saveStatus = '';
    let isSaving = false;

    
    // Event Definition state
    let eventDef = {
      resourceType: 'EventDefinition',
      status: 'active',
      name: '',
      title: '',
      description: '',
      eventType: 'webhook',
      condition: {
        type: '',
        config: null
      },
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
  switch(def.eventType) {
    case 'webhook':
      return [{
        type: "named-event",
        name: def.webhookConfig.path
      }];

    case 'timer':
      return [{
        type: "periodic",
        timingTiming: {
          repeat: {
            frequency: def.timerConfig.frequency,
            period: def.timerConfig.period,
            periodUnit: def.timerConfig.periodUnit
          }
        }
      }];

    case 'fhirchange':
      return [{
        type: "data-changed",
        data: [{
          type: def.fhirConfig.resourceType
        }],
        subscriptionTopic: "https://combinebh.org/fhir/subscription-topics/resource-change"
      }];
  }
}
    
    // Event handlers
    function initializeCondition(type) {
     if (!type) {
       eventDef.condition = {
         type: '',
         config: null
       };
       return;
     }
    
     eventDef.condition = {
       type,
       config: {...defaultConditionConfigs[type]}
     };
    }
    
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
  const baseOutputs = [];
  
  switch(def.eventType) {
    case 'webhook':
      return def.webhookConfig.payloadItems.map(item => ({
        type: "derived-from",
        label: `${item.name}${item.required ? '-req' : '-opt'}`,
        display: item.description || `Webhook payload: ${item.name}`,
        resource: OUTPUT_TYPES[item.type],
        citation: item.timing // Use timing from payload item
      }));

    case 'timer':
      return [{
        type: "derived-from",
        label: "timestamp-req",
        display: "Timer Execution Time",
        resource: "dateTime",
        citation: "execute"
      }];

    case 'fhirchange':
      return [
        {
          type: "derived-from",
          label: `${def.fhirConfig.resourceType.toLowerCase()}-req`,
          display: `Changed ${def.fhirConfig.resourceType}`,
          resource: def.fhirConfig.resourceType,
          citation: "execute"
        },
        {
          type: "derived-from",
          label: "action-req",
          display: "Change Action Type",
          resource: "code",
          citation: "execute"
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
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object</option>
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
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">
              Frequency
            </label>
            <input
              type="number"
              bind:value={eventDef.timerConfig.frequency}
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
              bind:value={eventDef.timerConfig.period}
              min="1"
              class="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Unit
            </label>
            <select
              bind:value={eventDef.timerConfig.periodUnit}
              class="w-full p-2 border rounded"
            >
              {#each TIMING_UNITS as unit}
                <option value={unit.code}>{unit.display}</option>
              {/each}
            </select>
          </div>
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
            Type: {output.resource}, Available: {output.citation} time
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>



    <!-- Condition Configuration -->
    <section class="mb-8 bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Trigger Condition</h3>
   
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">
          Condition Type
        </label>
        <select
          bind:value={eventDef.condition.type}
          on:change={(e) => initializeCondition(e.target.value)}
          class="w-full p-2 border rounded"
        >
          <option value="">No Condition</option>
          {#each CONDITION_TYPES as type}
            {#if type.contexts.includes(eventDef.eventType)}
              <option value={type.code}>{type.display}</option>
            {/if}
          {/each}
        </select>
      </div>
   
      {#if eventDef.condition.type === 'fhirpath'}
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">
              FHIRPath Expression
            </label>
            <textarea
              bind:value={eventDef.condition.config.expression}
              class="w-full p-2 border rounded font-mono"
              rows="3"
              placeholder="Enter FHIRPath expression..."
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Description
            </label>
            <input
              type="text"
              bind:value={eventDef.condition.config.description}
              class="w-full p-2 border rounded"
              placeholder="Describe what this condition checks..."
            />
          </div>
        </div>
   
      {:else if eventDef.condition.type === 'user'}
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">
              Required Roles
            </label>
            <select
              multiple
              bind:value={eventDef.condition.config.roles}
              class="w-full p-2 border rounded"
            >
              <option value="admin">Admin</option>
              <option value="provider">Provider</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Organizations
            </label>
            <select
              multiple
              bind:value={eventDef.condition.config.organizations}
              class="w-full p-2 border rounded"
            >
              <option value="org1">Organization 1</option>
              <option value="org2">Organization 2</option>
            </select>
          </div>
        </div>
   
      {:else if eventDef.condition.type === 'time'}
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">
                Start Time
              </label>
              <input
                type="time"
                bind:value={eventDef.condition.config.startTime}
                class="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                End Time
              </label>
              <input
                type="time"
                bind:value={eventDef.condition.config.endTime}
                class="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Days of Week
            </label>
            <div class="flex gap-2">
              {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day, i}
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:group={eventDef.condition.config.days}
                    value={i}
                    class="mr-1"
                  />
                  {day}
                </label>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </section>
   
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
  
   