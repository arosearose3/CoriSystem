<script>
  import { createEventDispatcher } from 'svelte';
  import { workflowStore, selectedElementStore } from '$lib/stores/workflow';
  import { fly } from 'svelte/transition';

  import { slide } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  let propertyValues = {};
  let propertyAssignments = {};
  let propertyPaths = {};
  let customFhirPath = '';
  let customFhirPathName = '';
  let selectedProperties = new Map();



  $: if ($selectedElementStore) {
    selectedProperties = new Map($selectedElementStore.properties || []);
  }

  $: if ($selectedElementStore) {
    propertyValues = {};
    propertyAssignments = {};
    propertyPaths = {};
    
    // Convert Map to regular objects for easier binding
    $selectedElementStore.properties?.forEach((value, key) => {
      if (key.startsWith('value-')) {
        propertyValues[key.replace('value-', '')] = value;
      } else if (key.startsWith('assignment-')) {
        propertyAssignments[key.replace('assignment-', '')] = value;
      } else if (key.startsWith('path-')) {
        propertyPaths[key.replace('path-', '')] = value;
      }
    });
  }

  $: activityProperties = $selectedElementStore ? 
  getPropertiesForActivity($selectedElementStore.data?.type) : {};

  $: console.log('Selected element:', $selectedElementStore);
  $: console.log('Activity properties:', activityProperties);


  // Property sections with example properties
  const propertySections = {
    setNow: {
      title: "Set Now",
      description: "Static values set during design",
      properties: [
        { 
          id: 'priority', 
          label: 'Priority', 
          type: 'string',
          source: 'design',  // Added back
          currentValue: '',
          defaultValue: 'high' 
        },
        { 
          id: 'category', 
          label: 'Category', 
          type: 'string',
          source: 'design',  // Added back
          currentValue: '',
          defaultValue: 'clinical' 
        },
        { 
          id: 'retry', 
          label: 'Retry Count', 
          type: 'number',
          source: 'design',  // Added back
          currentValue: '',
          defaultValue: 3 
        }
      ]
    },
    whenChosen: {
      title: "When Chosen",
      description: "Values set at workflow activation",
      properties: [
        { 
          id: 'assignedTeam', 
          label: 'Assigned Team', 
          type: 'string',
          source: 'activation'  // Added back
        },
        { 
          id: 'department', 
          label: 'Department', 
          type: 'string',
          source: 'activation'  // Added back
        },
        { 
          id: 'location', 
          label: 'Location', 
          type: 'string',
          source: 'activation'  // Added back
        }
      ]
    },
    userLoggedIn: {
      title: "User Logged In",
      description: "Values from authenticated user",
      properties: [
        { 
          id: 'practitionerId', 
          label: 'Practitioner ID', 
          type: 'string',
          source: 'user-context'  // Added back
        },
        { 
          id: 'role', 
          label: 'Role', 
          type: 'string',
          source: 'user-context'  // Added back
        },
        { 
          id: 'organization', 
          label: 'Organization', 
          type: 'string',
          source: 'user-context'  // Added back
        }
      ]
    },
    noUser: {
      title: "System Context",
      description: "Values from system configuration",
      properties: [
        { 
          id: 'apiEndpoint', 
          label: 'API Endpoint', 
          type: 'string',
          source: 'system-context'  // Added back
        },
        { 
          id: 'systemId', 
          label: 'System ID', 
          type: 'string',
          source: 'system-context'  // Added back
        },
        { 
          id: 'timeout', 
          label: 'Timeout', 
          type: 'number',
          source: 'system-context'  // Added back
        }
      ]
    },
    fromEvent: {
      title: "From Event",
      description: "Values from triggering event",
      properties: [
        { 
          id: 'patientId', 
          label: 'Patient ID', 
          type: 'string',
          source: 'event-context',  // Added back
          expression: 'Patient.id'
        },
        { 
          id: 'encounterId', 
          label: 'Encounter ID', 
          type: 'string',
          source: 'event-context',  // Added back
          expression: 'Encounter.id'
        },
        {
          id: 'status',
          label: 'Status',
          type: 'string',
          source: 'event-context',  // Added back
          expression: 'Resource.status'
        }
      ]
    }
  };



  function updateProperty(propKey, type, value) {
    if (!$selectedElementStore) return;

    const prefix = type === 'value' ? 'value-' :
                  type === 'assignment' ? 'assignment-' : 'path-';
    
    // Update local state
    if (type === 'value') propertyValues[propKey] = value;
    if (type === 'assignment') propertyAssignments[propKey] = value;
    if (type === 'path') propertyPaths[propKey] = value;

    // Update store
    const newProperties = new Map($selectedElementStore.properties || new Map());
    newProperties.set(`${prefix}${propKey}`, value);

    workflowStore.updateNodeProperties($selectedElementStore.id, newProperties);
  }




  function handlePropertyToggle(sectionId, property) {
    const key = `${sectionId}-${property.id}`;
    if (selectedProperties.has(key)) {
      selectedProperties.delete(key);
    } else {
      selectedProperties.set(key, {
        ...property,
        value: property.currentValue || property.defaultValue
      });
    }
    
    // Update the workflow store with new properties
    if ($selectedElementStore) {
      workflowStore.updateNodeProperties($selectedElementStore.id, selectedProperties);
    }
  }

  function handleValueChange(sectionId, property, event) {
    const key = `${sectionId}-${property.id}`;
    const newValue = property.type === 'number' ? 
      Number(event.target.value) : event.target.value;
    
    property.currentValue = newValue;
    
    if (selectedProperties.has(key)) {
      selectedProperties.set(key, {
        ...property,
        value: newValue
      });
      
      if ($selectedElementStore) {
        workflowStore.updateNodeProperties($selectedElementStore.id, selectedProperties);
      }
    }
  }

  function handleAddFhirPath() {
    if (!customFhirPath || !customFhirPathName) return;
    
    const newProperty = {
      id: `fhirpath-${Date.now()}`,
      label: customFhirPathName,
      type: 'string',
      source: 'event-context',
      expression: customFhirPath
    };
    
    propertySections.fromEvent.properties = [
      ...propertySections.fromEvent.properties,
      newProperty
    ];
    
    customFhirPath = '';
    customFhirPathName = '';
  }

  function getPropertiesForActivity(activityType) {
    // This would come from your activity definitions
    const allActivities = [
      // Flatten your activity categories to get all activities
      ...categories.flatMap(cat => cat.items)
    ];
    return allActivities.find(a => a.type === activityType)?.properties || {};
  }


</script>
<div class="property-panel">
  {#if $selectedElementStore}
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold">{$selectedElementStore.data?.title || 'Properties'}</h2>
      <p class="text-sm text-gray-600">Configure activity properties</p>
    </div>

    {#if Object.keys(activityProperties).length > 0}
      {#each Object.entries(activityProperties) as [propKey, propConfig]}
        <div class="p-4 border-b border-gray-200" transition:slide>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-700">
              {propConfig.label}
              {#if propConfig.required}
                <span class="text-red-500">*</span>
              {/if}
            </label>
          </div>

          <div class="space-y-2">
            <!-- Property Assignment Type Selection -->
            <select 
              class="w-full p-2 border rounded-md text-sm"
              value={propertyAssignments[propKey] || 'design'}
              on:change={(e) => updateProperty(propKey, 'assignment', e.target.value)}
            >
              <option value="design">Set Now</option>
              <option value="activation">Set at Activation</option>
              <option value="runtime">Set at Runtime</option>
            </select>

            <!-- Value input if "Set Now" is selected -->
            {#if propertyAssignments[propKey] === 'design'}
              {#if propConfig.options}
                <select 
                  class="w-full p-2 border rounded-md text-sm"
                  value={propertyValues[propKey] || ''}
                  on:change={(e) => updateProperty(propKey, 'value', e.target.value)}
                >
                  <option value="">Select {propConfig.label}</option>
                  {#each propConfig.options as option}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
              {:else if propConfig.type === 'number'}
                <input 
                  type="number"
                  class="w-full p-2 border rounded-md text-sm"
                  value={propertyValues[propKey] || ''}
                  on:input={(e) => updateProperty(propKey, 'value', e.target.value)}
                />
              {:else if propConfig.type === 'date'}
                <input 
                  type="date"
                  class="w-full p-2 border rounded-md text-sm"
                  value={propertyValues[propKey] || ''}
                  on:input={(e) => updateProperty(propKey, 'value', e.target.value)}
                />
              {:else}
                <input 
                  type="text"
                  class="w-full p-2 border rounded-md text-sm"
                  placeholder={`Enter ${propConfig.label.toLowerCase()}`}
                  value={propertyValues[propKey] || ''}
                  on:input={(e) => updateProperty(propKey, 'value', e.target.value)}
                />
              {/if}
            {/if}

            <!-- Runtime configuration if "Set at Runtime" is selected -->
            {#if propertyAssignments[propKey] === 'runtime'}
              <input 
                type="text"
                class="w-full p-2 border rounded-md text-sm"
                placeholder="Enter runtime path (e.g. %event.patientId)"
                value={propertyPaths[propKey] || ''}
                on:input={(e) => updateProperty(propKey, 'path', e.target.value)}
              />
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <div class="p-4 text-gray-500">
        No configurable properties for this element
      </div>
    {/if}
  {:else}
    <div class="p-4 text-gray-500">
      Select a node to view properties
    </div>
  {/if}
</div>

<style>
  .property-panel {
    height: 100%;
    overflow-y: auto;
    background-color: #f9fafb;
  }

  /* Scrollbar styling */
  .property-panel {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }

  .property-panel::-webkit-scrollbar {
    width: 6px;
  }

  .property-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .property-panel::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .section:last-child {
    border-bottom: none;
  }
</style>