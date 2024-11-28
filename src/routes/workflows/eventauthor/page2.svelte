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
    validation: (expr) => true // Complex validation in component
  },
  {
    code: 'data',
    display: 'Data Validation',
    contexts: ['webhook', 'fhirchange'],
    inputType: 'schema',
    validation: (expr) => true // JSON schema validation
  }
];

// Initialize empty event definition
let eventDef = {
  resourceType: 'EventDefinition',
  id: nanoid(),
  status: 'active',
  name: '',
  title: '',
  description: '',
  eventType: 'webhook',
  trigger: [{
    type: 'named-event',
    name: '',
    data: [],
    timingTiming: null
  }],
  // Type-specific configurations
  webhookConfig: {
    path: `api/webhook/${nanoid(8)}`,
    payloadItems: []
  },
  timerConfig: {
    frequency: 1,
    period: 1,
    periodUnit: 'd'
  },
  fhirConfig: {
    resourceType: 'Patient',
    action: 'all' // 'all', 'create', 'update', 'delete'
  },
  condition: {
    type: '',
    config: null
  }
};

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




// Reactive trigger definition based on event type
$: eventDef.trigger = generateTrigger(eventDef);


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

function generateTrigger(def) {
  const baseTrigger = {
    id: def.id,
    type: getTriggerType(def.eventType)
  };

  // Changed or Added: If condition exists, add to base trigger
  if (def.condition.type) {
    baseTrigger.condition = generateCondition(def.condition);
  }

  switch(def.eventType) {
    case 'webhook':
      return [{
        ...baseTrigger,
        name: def.webhookConfig.path,
        code: {
          coding: [{
            system: 'https://combinebh.org/fhir/trigger-type',
            code: 'webhook'
          }]
        }
      }];

    case 'timer':
      return [{
        ...baseTrigger,
        timingTiming: {
          repeat: {
            frequency: def.timerConfig.frequency,
            period: def.timerConfig.period,
            periodUnit: def.timerConfig.periodUnit
          }
        }
      }];

    case 'fhirchange':
      const trigger = {
        ...baseTrigger,
        data: [{
          type: def.fhirConfig.resourceType,
          profile: [`http://hl7.org/fhir/StructureDefinition/${def.fhirConfig.resourceType}`]
        }],
        subscriptionTopic: 'https://combinebh.org/fhir/subscription-topics/resource-change'
      };

      // Changed or Added: For FHIR changes, add specific condition if needed
      if (def.fhirConfig.action !== 'all') {
        if (!trigger.condition) {
          trigger.condition = {
            language: 'text/fhirpath',
            expression: ''
          };
        }
        // Append action condition to any existing conditions
        const actionCondition = `action = '${def.fhirConfig.action}'`;
        trigger.condition.expression = trigger.condition.expression
          ? `(${trigger.condition.expression}) and ${actionCondition}`
          : actionCondition;
      }

      return [trigger];
  }
}

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

function addPayloadItem() {
  eventDef.webhookConfig.payloadItems = [
    ...eventDef.webhookConfig.payloadItems,
    { name: '', type: 'string', required: true, id: nanoid() }
  ];
}

function removePayloadItem(id) {
  eventDef.webhookConfig.payloadItems = eventDef.webhookConfig.payloadItems
    .filter(item => item.id !== id);
}

// Generate outputs based on event type and configuration
$: outputs = generateOutputs(eventDef);

function generateOutputs(def) {
  switch(def.eventType) {
    case 'webhook':
      return def.webhookConfig.payloadItems.map(item => ({
        type: "derived-from",
        label: `${item.name}${item.required ? '-req' : '-opt'}`,
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
        label: "timestamp-req",
        display: "Timer execution timestamp",
        extension: [{
          url: "https://combinebh.org/fhir/event-mapping",
          extension: [{
            url: "path",
            valueString: "message.publishTime"
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
          resource: def.fhirConfig.resourceType,
          extension: [{
            url: "https://combinebh.org/fhir/event-mapping",
            extension: [{
              url: "path",
              valueString: "message.data"
            }]
          }]
        }
      ];
  }
}
function generateCondition(condition) {
  switch(condition.type) {
    case 'fhirpath':
      return {
        language: 'text/fhirpath',
        expression: condition.config.expression
      };

    case 'user':
      const userConditions = [];
      if (condition.config.roles.length) {
        userConditions.push(`user.role in (${condition.config.roles.map(r => `'${r}'`).join(',')})`);
      }
      if (condition.config.organizations.length) {
        userConditions.push(`user.organization in (${condition.config.organizations.map(o => `'${o}'`).join(',')})`);
      }
      if (condition.config.permissions.length) {
        userConditions.push(condition.config.permissions.map(p => `user.hasPermission('${p}')`).join(' and '));
      }
      return {
        language: 'text/fhirpath',
        expression: userConditions.join(' and ')
      };

    case 'time':
      const timeConditions = [];
      if (condition.config.days.length) {
        timeConditions.push(`%now.dayOfWeek in (${condition.config.days.join(',')})`);
      }
      if (condition.config.startTime && condition.config.endTime) {
        timeConditions.push(`%now.timeOfDay >= '${condition.config.startTime}' and %now.timeOfDay <= '${condition.config.endTime}'`);
      }
      return {
        language: 'text/fhirpath',
        expression: timeConditions.join(' and ')
      };

    case 'data':
      return {
        language: 'application/json',
        expression: JSON.stringify(condition.config.schema)
      };
  }
}
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

  <!-- Type-specific Configuration -->
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

  <!-- Not Changed: Existing template sections... -->

<!-- Changed or Added: Add Condition Section -->
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
        <!-- Organizations and Permissions similarly... -->
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
  
    {:else if eventDef.condition.type === 'data'}
      <!-- Changed or Added: JSON Schema Editor component would go here -->
      <div class="text-sm text-gray-600">
        JSON Schema editor to be implemented...
      </div>
    {/if}
  
    {#if eventDef.condition.type}
      <div class="mt-4 p-4 bg-gray-50 rounded">
        <h4 class="font-medium mb-2">Generated Condition</h4>
        <pre class="text-sm overflow-auto">
          {JSON.stringify(generateCondition(eventDef.condition), null, 2)}
        </pre>
      </div>
    {/if}
  </section>
  
  <!-- Not Changed: Rest of template... -->

  <!-- Output Preview -->
  <section class="mb-8 bg-white p-6 rounded-lg shadow">
    <h3 class="text-lg font-semibold mb-4">Event Outputs</h3>
    
    <div class="space-y-2">
      {#each outputs as output}
        <div class="p-3 bg-gray-50 rounded border">
          <div class="font-medium">{output.label}</div>
          <div class="text-sm text-gray-600">{output.display}</div>
          <div class="text-xs text-gray-500 font-mono mt-1">
            Path: {output.extension[0].extension[0].valueString}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Event Definition Preview -->
  <section class="bg-white p-6 rounded-lg shadow">
    <h3 class="text-lg font-semibold mb-4">Preview</h3>
    
    <pre class="bg-gray-50 p-4 rounded overflow-auto text-sm">
      {JSON.stringify({
        resourceType: 'EventDefinition',
        id: eventDef.id,
        name: eventDef.name,
        title: eventDef.title,
        description: eventDef.description,
        status: eventDef.status,
        trigger: eventDef.trigger,
        relatedArtifact: outputs
      }, null, 2)}
    </pre>
  </section>
</div>


