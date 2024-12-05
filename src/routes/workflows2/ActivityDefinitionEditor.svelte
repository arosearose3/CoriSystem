<script>
  import { writable } from 'svelte/store';
  import { base } from '$app/paths'; 
  import Plus from 'lucide-svelte/icons/plus';
  import PropertyField from './InputField.svelte';
  import OutputField from './OutputField.svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  
  function slugify(text) {
      return text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
  }

  const activityDefinition = writable({
    resourceType: "ActivityDefinition",
    description: "Send Email",
    id: "send-email-template",
    status: "draft",
    kind: "Task",
    name: "send_email",
    title: "Send Email",
    dynamicValue: [
        {
            path: "/Task/apiPath",
            expression: {
                language: "text/fhirpath",
                expression: "api/email",
                name: "apiPath"
            }
        }
    ]
});

  const inputTypes = [
      { value: "int", label: "Integer" },
      { value: "float", label: "Float" },
      { value: "string", label: "String" },
      { value: "FhirpathString", label: "FHIR Path String" },
      { value: "ResourceReference", label: "Resource Reference" }
  ];

  const outputTypes = [
      { value: "int", label: "Integer" },
      { value: "float", label: "Float" },
      { value: "string", label: "String" },
      { value: "FhirpathString", label: "FHIR Path String" },
      { value: "ResourceReference", label: "Resource Reference" },
      { value: "boolean", label: "Boolean" },
      { value: "date", label: "Date" },
      { value: "datetime", label: "Date Time" }
  ];

  const definitionStages = [
      { value: "Template Creation", label: "Template Creation" },
      { value: "Instance Time", label: "Instance Time" },
      { value: "Execution Time", label: "Execution Time" }
  ];

  const mappingSources = [
      { value: "Previous Task", label: "Previous Task" },
      { value: "Event", label: "Event" },
      { value: "System", label: "System" },
      { value: "Context", label: "Context" },
      { value: "Fhirpath", label: "FHIR Path" },
      { value: "User Input", label: "User Input" }
  ];

  const validationRules = {
      int: ["required", "min:0", "max:100"],
      float: ["required", "min:0.0", "max:100.0"],
      string: ["required", "maxLength:100", "minLength:5", "pattern:/^[A-Za-z]+$/"],
      FhirpathString: ["required"],
      ResourceReference: ["required"]
  };

  function groupInputs(dynamicValues) {
      if (!dynamicValues) return [];
      
      const groups = {};
      dynamicValues.forEach(dv => {
          if (dv.expression.name === 'apiPath') return;
          
          if (!dv.path.includes('/input[')) return;
          
          const prefix = dv.expression.name.split('-')[0];
          if (!prefix) return;
          
          if (!groups[prefix]) {
              groups[prefix] = { 
                  prefix, 
                  dynamicValues: []
              };
          }
          groups[prefix].dynamicValues.push(dv);
      });

      return Object.values(groups);
  }

  function groupOutputs(dynamicValues) {
      if (!dynamicValues) return [];
      
      const groups = {};
      dynamicValues.forEach(dv => {
          if (dv.expression.name === 'apiPath') return;
          
          if (!dv.path.includes('/output[')) return;
          
          const prefix = dv.expression.name.split('-')[0];
          if (!prefix) return;
          
          if (!groups[prefix]) {
              groups[prefix] = { 
                  prefix, 
                  dynamicValues: []
              };
          }
          groups[prefix].dynamicValues.push(dv);
      });

      return Object.values(groups);
  }

  function addProperty() {
      const propertyName = prompt("Enter property name (e.g., Subject)");
      if (!propertyName) return;

      const prefix = slugify(propertyName);
      
      activityDefinition.update(current => {
          const newDynamicValues = [
              {
                  path: `/Task/input[${prefix}]/name`,
                  expression: {
                      language: "text/fhirpath",
                      expression: propertyName,
                      name: `${prefix}-name`
                  }
              },
              {
                  path: `/Task/input[${prefix}]/type`,
                  expression: {
                      language: "text/fhirpath",
                      expression: "string",
                      name: `${prefix}-type`
                  }
              },
              {
                  path: `/Task/input[${prefix}]/definedAt`,
                  expression: {
                      language: "text/fhirpath",
                      expression: "Execution Time",
                      name: `${prefix}-definedAt`
                  }
              },
              {
                  path: `/Task/input[${prefix}]/mappingSource`,
                  expression: {
                      language: "text/fhirpath",
                      expression: "User Input",
                      name: `${prefix}-mappingSource`
                  }
              },
              {
                  path: `/Task/input[${prefix}]/mappingPath`,
                  expression: {
                      language: "text/fhirpath",
                      expression: "",
                      name: `${prefix}-mappingPath`
                  }
              }
          ];

          return {
              ...current,
              dynamicValue: [...current.dynamicValue, ...newDynamicValues]
          };
      });
  }

  function addOutput() {
      const outputName = prompt("Enter output name (e.g., Result)");
      if (!outputName) return;

      const prefix = slugify(outputName);
      
      activityDefinition.update(current => {
          const newDynamicValues = [
              {
                  path: `/Task/output[${prefix}]/name`,
                  expression: {
                      language: "text/fhirpath",
                      expression: outputName,
                      name: `${prefix}-name`
                  }
              },
              {
                  path: `/Task/output[${prefix}]/type`,
                  expression: {
                      language: "text/fhirpath",
                      expression: "string",
                      name: `${prefix}-type`
                  }
              },
              {
                  path: `/Task/output[${prefix}]/expression`,
                  expression: {
                      language: "text/fhirpath",
                      expression: "",
                      name: `${prefix}-expression`
                  }
              }
          ];

          return {
              ...current,
              dynamicValue: [...current.dynamicValue, ...newDynamicValues]
          };
      });
  }

  function handlePropertyUpdate(event) {
      const { prefix, field, dynamicValue } = event.detail;
      
      activityDefinition.update(current => {
          const currentValues = current.dynamicValue || [];
          const index = currentValues.findIndex(dv => 
              dv.expression.name === `${prefix}-${field}`
          );

          if (index >= 0) {
              currentValues[index] = dynamicValue;
          } else {
              currentValues.push(dynamicValue);
          }

          return {
              ...current,
              dynamicValue: currentValues
          };
      });
  }

  function handlePropertyRemove(event) {
      const { prefix } = event.detail;
      
      activityDefinition.update(current => {
          const filteredValues = current.dynamicValue.filter(dv => 
              !dv.expression.name.startsWith(prefix)
          );

          return {
              ...current,
              dynamicValue: filteredValues
          };
      });
  }

  async function handleSave() {
    try {
        const cleanedDefinition = cleanForPreview($activityDefinition);
        const response = await fetch(`${base}/api/activitydefinition/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cleanedDefinition)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save activity definition: ${response.statusText}`);
        }
        
        alert('Activity Definition saved successfully');
        
    } catch (error) {
        console.error('Error saving activity definition:', error);
        alert('Failed to save activity definition: ' + error.message);
    }
}

  function cleanForPreview(def) {
    const clean = { ...def };
    
    // Remove non-standard properties
    delete clean.inputProfile;
    delete clean.outputProfile;

    // Filter dynamicValue array
    if (clean.dynamicValue?.length) {
        clean.dynamicValue = clean.dynamicValue.filter(dv => 
            dv.expression?.expression && 
            dv.expression.expression.trim() !== ''
        );

        if (clean.dynamicValue.length === 0) {
            delete clean.dynamicValue;
        }
    } else {
        delete clean.dynamicValue;
    }

    return clean;
}
</script>

<!-- Add this at the very top of the template, before the grid -->
<div class="button-bar">
  <div class="flex gap-4">
      <button class="btn btn-primary" on:click={handleSave}>
          Save Activity Definition
      </button>
      <button class="btn btn-secondary" on:click={() => dispatch('cancel')}>
          Cancel
      </button>
  </div>
</div>

<div class="grid grid-cols-2 gap-4 p-4">
  <!-- Basic Information -->
  <div class="border rounded-lg p-4 space-y-4">
      <!-- Description -->
      <div>
          <label class="label">Activity Description</label>
          <input
              type="text"
              class="input w-full"
              placeholder="Enter activity description"
              bind:value={$activityDefinition.description}
              on:input={(e) => {
                  const value = e.target.value;
                  activityDefinition.update(current => ({ 
                      ...current, 
                      description: value,
                      name: slugify(value),
                      id: `${slugify(value)}-activity`,
                      title: value
                  }))
              }}
          />
      </div>

      <!-- Kind -->
      <div>
          <label class="label">Activity Kind</label>
          <select
              class="input w-full"
              bind:value={$activityDefinition.kind}
          >
              <option value="Task">Task</option>
              <option value="ServiceRequest">Service Request</option>
              <option value="MessageHeader">Message</option>
          </select>
      </div>

      <!-- Status -->
      <div>
          <label class="label">Status</label>
          <select
              class="input w-full"
              bind:value={$activityDefinition.status}
          >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
              <option value="unknown">Unknown</option>
          </select>
      </div>

      <!-- API Path -->
      <div>
          <label class="label">API Path</label>
          <input
              type="text"
              class="input w-full"
              placeholder="Enter API path (e.g., api/email)"
              value={$activityDefinition.dynamicValue[0]?.expression?.expression || ''}
              on:input={(e) => {
                  activityDefinition.update(current => ({
                      ...current,
                      dynamicValue: [
                          {
                              path: "/Task/apiPath",
                              expression: {
                                  language: "text/fhirpath",
                                  expression: e.target.value,
                                  name: "apiPath"
                              }
                          },
                          ...current.dynamicValue.slice(1)
                      ]
                  }))
              }}
          />
      </div>
  </div>

  <!-- Add Property/Output Buttons -->
  <div class="flex flex-col gap-4 justify-start p-4">
      <button class="btn btn-primary" on:click={addProperty}>
          <Plus class="w-4 h-4 mr-2" /> Add Input Property
      </button>
      
      <button class="btn btn-primary" on:click={addOutput}>
          <Plus class="w-4 h-4 mr-2" /> Add Output Property
      </button>
  </div>

  <!-- Properties Section -->
  <div class="col-span-2 grid grid-cols-2 gap-4">
      <!-- Input Properties -->
      <div class="space-y-4">
          <h3 class="text-lg font-semibold">Input Properties</h3>
          {#each groupInputs($activityDefinition.dynamicValue || []) as property (property.prefix)}
              <PropertyField
                  prefix={property.prefix}
                  dynamicValues={property.dynamicValues}
                  {inputTypes}
                  {validationRules}
                  {mappingSources}
                  {definitionStages}
                  on:update={handlePropertyUpdate}
                  on:remove={handlePropertyRemove}
              />
          {/each}
      </div>

      <!-- Output Properties -->
      <div class="space-y-4">
          <h3 class="text-lg font-semibold">Output Properties</h3>
          {#each groupOutputs($activityDefinition.dynamicValue || []) as property (property.prefix)}
              <OutputField
                  prefix={property.prefix}
                  dynamicValues={property.dynamicValues}
                  {outputTypes}
                  on:update={handlePropertyUpdate}
                  on:remove={handlePropertyRemove}
              />
          {/each}
      </div>
  </div>
</div>

<!-- Preview Section -->
<div class="border rounded-lg p-4 mt-8">
  <h2 class="text-xl font-bold mb-4">Preview</h2>
  <pre class="bg-gray-100 p-4 rounded overflow-auto">
      {JSON.stringify(cleanForPreview($activityDefinition), null, 2)}
  </pre>
</div>

  <style>

.button-bar {
        padding: 1rem;
        background-color: white;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 1rem;
    }

    .btn-secondary {
        background-color: #6b7280;
    }

    .btn-secondary:hover {
        background-color: #4b5563;
    }

    .label {
      font-weight: bold;
      margin-bottom: 0.5rem;
      display: block;
    }
  
    .input, .textarea, .select {
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 0.25rem;
      width: 100%;
    }
  
    .btn {
      background-color: #007bff;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
  
    .btn-primary {
      background-color: #0056b3;
    }
  
    .btn:hover {
      background-color: #0056b3;
    }
  
    .btn-danger {
      background-color: #dc3545;
      color: white;
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
    }
  
    .btn-danger:hover {
      background-color: #c82333;
    }
  
    /* Additional styling for better layout */
    .border {
      border: 1px solid #ddd;
    }
  
    .rounded-lg {
      border-radius: 0.5rem;
    }
  
    .p-4 {
      padding: 1rem;
    }
  
    .space-y-4 > * + * {
      margin-top: 1rem;
    }
  
    .mt-8 {
      margin-top: 2rem;
    }
  
    .mb-4 {
      margin-bottom: 1rem;
    }
  
    .mt-2 {
      margin-top: 0.5rem;
    }
  
    .mt-4 {
      margin-top: 1rem;
    }
  
    .grid {
      display: grid;
    }
  
    .grid-cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }
  
    .grid-cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  
    .gap-4 {
      gap: 1rem;
    }
  
    .col-span-2 {
      grid-column: span 2 / span 2;
    }
  
    .flex {
      display: flex;
    }
  
    .items-center {
      align-items: center;
    }
  
    .justify-center {
      justify-content: center;
    }
  
    .gap-2 {
      gap: 0.5rem;
    }
  
    .space-y-2 > * + * {
      margin-top: 0.5rem;
    }
  
    .bg-gray-100 {
      background-color: #f7fafc;
    }
  
    .rounded {
      border-radius: 0.25rem;
    }
  
    .textarea {
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 0.25rem;
      width: 100%;
      resize: vertical;
    }
  
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
  