<script>
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();

  // Property sections with example properties
  const propertySections = {
    setNow: {
      title: "Set Now",
      description: "Static values set during design",
      properties: [
        { id: 'priority', label: 'Priority', type: 'string', value: 'high', source: 'design' },
        { id: 'category', label: 'Category', type: 'string', value: 'clinical', source: 'design' },
        { id: 'retry', label: 'Retry Count', type: 'number', value: 3, source: 'design' }
      ]
    },
    whenChosen: {
      title: "When Chosen",
      description: "Values set at workflow activation",
      properties: [
        { id: 'assignedTeam', label: 'Assigned Team', type: 'string', source: 'activation' },
        { id: 'department', label: 'Department', type: 'string', source: 'activation' },
        { id: 'location', label: 'Location', type: 'string', source: 'activation' }
      ]
    },
    userLoggedIn: {
      title: "User Logged In",
      description: "Values from authenticated user",
      properties: [
        { id: 'practitionerId', label: 'Practitioner ID', type: 'string', source: 'user-context' },
        { id: 'role', label: 'Role', type: 'string', source: 'user-context' },
        { id: 'organization', label: 'Organization', type: 'string', source: 'user-context' }
      ]
    },
    noUser: {
      title: "System Context",
      description: "Values from system configuration",
      properties: [
        { id: 'apiEndpoint', label: 'API Endpoint', type: 'string', source: 'system-context' },
        { id: 'systemId', label: 'System ID', type: 'string', source: 'system-context' },
        { id: 'timeout', label: 'Timeout', type: 'number', source: 'system-context' }
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
          source: 'event-context',
          expression: 'Patient.id' 
        },
        { 
          id: 'encounterId', 
          label: 'Encounter ID', 
          type: 'string', 
          source: 'event-context',
          expression: 'Encounter.id' 
        },
        {
          id: 'status',
          label: 'Status',
          type: 'string',
          source: 'event-context',
          expression: 'Resource.status'
        }
      ]
    }
  };

  let customFhirPath = '';
  let customFhirPathName = '';
  let selectedProperties = new Set();
  let draggedProperty = null;

  function handlePropertyToggle(sectionId, propertyId) {
    const key = `${sectionId}-${propertyId}`;
    if (selectedProperties.has(key)) {
      selectedProperties.delete(key);
    } else {
      selectedProperties.add(key);
    }
    selectedProperties = selectedProperties; // Trigger reactivity
    dispatch('propertiesChange', { selectedProperties });
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

  function handleDragStart(event, property, sectionId) {
    draggedProperty = { ...property, sectionId };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify(draggedProperty));
    
    // Add custom drag image/ghost element
    const ghost = event.target.cloneNode(true);
    ghost.classList.add('dragging-ghost');
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    
    event.target.classList.add('dragging');
  }

  function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedProperty = null;
  }
</script>

<div class="property-panel">
  <!-- Property Sections -->
  {#each Object.entries(propertySections) as [sectionId, section]}
    <div class="section bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">{section.title}</h3>
      <p class="text-sm text-gray-600 mb-3">{section.description}</p>
      
      <div class="property-chips flex flex-wrap gap-2">
        {#each section.properties as property}
          <div
            class="property-chip group"
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, property, sectionId)}
            on:dragend={handleDragEnd}
          >
            <div class="flex items-center p-2 bg-white rounded-lg border border-gray-200 
                        shadow-sm hover:shadow-md transition-all cursor-move group-hover:border-blue-400">
              <input
                type="checkbox"
                class="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={selectedProperties.has(`${sectionId}-${property.id}`)}
                on:change={() => handlePropertyToggle(sectionId, property.id)}
              />
              <span class="ml-2 text-sm font-medium text-gray-700">{property.label}</span>
              {#if property.expression}
                <span class="ml-2 text-xs text-gray-500 italic">{property.expression}</span>
              {/if}
              <div class="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {property.type}
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- FHIRPath input for Event section -->
      {#if sectionId === 'fromEvent'}
        <div class="mt-4 space-y-2">
          <input
            type="text"
            class="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Property name"
            bind:value={customFhirPathName}
          />
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="flex-1 px-3 py-2 border rounded-md text-sm font-mono
                     focus:ring-blue-500 focus:border-blue-500"
              placeholder="FHIRPath expression (e.g. Patient.name.given.first())"
              bind:value={customFhirPath}
            />
            <button
              class="p-2 text-blue-600 hover:bg-blue-50 rounded-md
                     disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={handleAddFhirPath}
              disabled={!customFhirPath || !customFhirPathName}
            >
              <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" 
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" 
                      clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .property-panel {
    @apply p-4 h-full overflow-y-auto bg-gray-50;
  }

  .property-chip {
    @apply transition-transform duration-200;
  }

  .property-chip.dragging {
    @apply opacity-50;
  }

  .property-chip:hover {
    @apply transform -translate-y-0.5;
  }

  .dragging-ghost {
    @apply fixed opacity-0 pointer-events-none;
  }

  /* Custom scrollbar styling */
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

  /* Animations */
  @keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .property-chip:active {
    animation: pop 0.3s ease-in-out;
  }
</style>