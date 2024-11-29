<script>
  import { createEventDispatcher } from 'svelte';
  import { workflowStore, selectedElementStore } from '$lib/stores/workflow';
  import { activityDefinitions, activityInstanceStore } from '$lib/stores/activityDefinitions.js';
  import { fly } from 'svelte/transition';

  import { slide } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  let propertyValues = {};
  let propertyAssignments = {};
  let propertyPaths = {};
  let customFhirPath = '';
  let customFhirPathName = '';
  let selectedProperties = new Map();

  let currentProperties = new Map();
  let validationErrors = new Map();



  $: if ($selectedElementStore) {
    selectedProperties = new Map($selectedElementStore.properties || []);
    console.log('PropPanel Selected properties:', selectedProperties);
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

  $: {
    if ($selectedElementStore?.type === 'activity') {
      const activityType = $selectedElementStore.data?.type;
      const activityDef = activityDefinitions[activityType];
      
      if (activityDef) {
        initializeProperties(activityDef.properties);
      }
    }
  }

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

  function initializeProperties(propertyDefs) {
    const stored = $activityInstanceStore[$selectedElementStore.id] || {};
    
    currentProperties = new Map(
      Object.entries(propertyDefs).map(([key, def]) => {
        return [key, {
          ...def,
          value: stored[key]?.value || def.default || '',
          assignmentType: stored[key]?.assignmentType || 'design',
          runtimePath: stored[key]?.runtimePath || ''
        }];
      })
    );
  }


  function updateProperty(key, updateType, value) {
    if (!currentProperties.has(key)) return;

    const property = currentProperties.get(key);
    const newProperty = { ...property };

    switch (updateType) {
      case 'value':
        newProperty.value = value;
        validateProperty(key, value);
        break;
      case 'assignment':
        newProperty.assignmentType = value;
        if (value !== 'design') {
          newProperty.value = '';
        }
        break;
      case 'path':
        newProperty.runtimePath = value;
        break;
    }

    currentProperties.set(key, newProperty);
    savePropertyUpdates();
  }

  function validateProperty(key, value) {
    const property = currentProperties.get(key);
    if (!property) return;

    const errors = [];
    
    if (property.required && !value) {
      errors.push('This field is required');
    }

    if (property.type === 'number' && isNaN(value)) {
      errors.push('Must be a valid number');
    }

    if (errors.length) {
      validationErrors.set(key, errors);
    } else {
      validationErrors.delete(key);
    }
  }

  function savePropertyUpdates() {
    if (!$selectedElementStore) return;

    const propertyValues = {};
    currentProperties.forEach((prop, key) => {
      propertyValues[key] = {
        value: prop.value,
        assignmentType: prop.assignmentType,
        runtimePath: prop.runtimePath
      };
    });

    activityInstanceStore.update(store => ({
      ...store,
      [$selectedElementStore.id]: propertyValues
    }));

    workflowStore.updateNode($selectedElementStore.id, {
      properties: currentProperties
    });
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
  {#if $selectedElementStore?.type === 'activity'}
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold">
        {$selectedElementStore.data?.title || 'Activity Properties'}
      </h2>
    </div>

    {#if currentProperties.size > 0}
      {#each [...currentProperties] as [key, property]}
        <div class="p-4 border-b border-gray-200" transition:slide>
          <div class="property-header">
            <label class="text-sm font-medium text-gray-700">
              {property.label}
              {#if property.required}
                <span class="text-red-500">*</span>
              {/if}
            </label>
            {#if property.description}
              <div class="text-xs text-gray-500">{property.description}</div>
            {/if}
          </div>

          <div class="property-content">
            <select 
              class="assignment-type"
              value={property.assignmentType}
              on:change={(e) => updateProperty(key, 'assignment', e.target.value)}
            >
              <option value="design">Set Now</option>
              <option value="activation">Set at Activation</option>
              <option value="runtime">Set at Runtime</option>
            </select>

            {#if property.assignmentType === 'design'}
              {#if property.type === 'select'}
                <select
                  class="property-input"
                  value={property.value}
                  on:change={(e) => updateProperty(key, 'value', e.target.value)}
                >
                  <option value="">Select {property.label}</option>
                  {#each property.options as option}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type={property.type}
                  class="property-input"
                  value={property.value}
                  on:input={(e) => updateProperty(key, 'value', e.target.value)}
                  placeholder={`Enter ${property.label.toLowerCase()}`}
                />
              {/if}
            {:else if property.assignmentType === 'runtime'}
              <input
                type="text"
                class="property-input"
                value={property.runtimePath}
                placeholder="Enter runtime path (e.g. %event.patientId)"
                on:input={(e) => updateProperty(key, 'path', e.target.value)}
              />
            {/if}

            {#if validationErrors.has(key)}
              <div class="validation-error">
                {validationErrors.get(key).join(', ')}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <div class="p-4 text-gray-500">
        No configurable properties for this activity
      </div>
    {/if}
  {:else}
    <div class="p-4 text-gray-500">
      Select an activity to view properties
    </div>
  {/if}
</div>

<style>
 
  .property-panel {
    height: 100%;
    overflow-y: auto;
    background-color: #f9fafb;
  }

  .property-header {
    margin-bottom: 8px;
  }

  .property-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .property-input,
  .assignment-type {
    width: 100%;
    padding: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 14px;
  }

  .validation-error {
    color: #ef4444;
    font-size: 12px;
    margin-top: 4px;
  }

  .property-input:focus,
  .assignment-type:focus {
    outline: none;
    border-color: #3b82f6;
    ring: 2px;
    ring-color: rgba(59, 130, 246, 0.5);
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