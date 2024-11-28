<script>
    import { writable } from 'svelte/store';
    import Plus from 'lucide-svelte/icons/plus';
    import PropertyField from './InputField.svelte';
    import OutputField from './OutputField.svelte';
    
    function slugify(text) {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  
    const template = writable({
      description: "Send Email",
      id: "send-email-template",
      intent: "unknown",
      status: "draft",
      input: [
        {
          type: {
            coding: [{
              system: "http://combinebh.org/fhir/task-inputs",
              code: "apiPath",
              display: "API Path"
            }],
            text: "API Path"
          },
          valueString: "api/email"
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
      { value: "datetime", label: "Date Time" },
      { value: "url", label: "URL" },
      { value: "array", label: "Array" }
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
  
    const availableTasks = writable([
      { id: 'task1', name: 'Lab Order' },
      { id: 'task2', name: 'Document Creation' }
    ]);

    function getTaskOutputs(taskId) {
      const outputs = {
        task1: [
          { id: 'result', type: { valueType: 'int' } },
          { id: 'status', type: { valueType: 'string' } }
        ],
        task2: [
          { id: 'fileUrl', type: { valueType: 'string' } }
        ]
      };
      return outputs[taskId] || [];
    }

    // Function to group inputs by property prefix
    function groupInputs(inputs) {
      if (!inputs) return [];
      
      const groups = {};
      inputs.forEach(input => {
        const code = input?.type?.coding?.[0]?.code;
        if (!code || code === "apiPath") return;
        
        const prefix = code.split('-')[0];
        if (!prefix) return;
        
        if (!groups[prefix]) {
          groups[prefix] = { prefix, inputs: [] };
        }
        groups[prefix].inputs.push(input);
      });

      return Object.values(groups);
    }

    let currentTemplate;
    template.subscribe(value => {
      currentTemplate = value;
    });

    function handlePropertyUpdate(event) {
      const updatedInput = event.detail;
      template.update(current => ({
        ...current,
        input: (current.input || []).map(input => 
          input.type.coding[0].code === updatedInput.type.coding[0].code ? updatedInput : input
        )
      }));
    }

    function handlePropertyRemove(event) {
      const { prefix } = event.detail;
      template.update(current => {
        const updatedTemplate = {
          ...current,
          input: (current.input || []).filter(input => 
            !input.type.coding[0].code.startsWith(prefix)
          )
        };
        
        if (!updatedTemplate.input?.length) {
          delete updatedTemplate.input;
        }
        
        return updatedTemplate;
      });
    }

    function addProperty() {
      const propertyName = prompt("Enter property name (e.g., Subject)");
      if (!propertyName) return;

      const prefix = propertyName.toLowerCase().replace(/\s+/g, '_');
      
      template.update(current => ({
        ...current,
        id: `${slugify(current.description)}-template`,
        input: [
          ...(current.input || []),
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-name`, display: `${propertyName} Name` }], text: `${propertyName} Name` },
            valueString: propertyName
          },
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-type`, display: `${propertyName} Type` }], text: `${propertyName} Type` },
            valueString: "string"
          },
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-definedAt`, display: `${propertyName} Defined At` }], text: `${propertyName} Defined At` },
            valueString: "Execution Time"
          },
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-mappingSource`, display: `${propertyName} Mapping Source` }], text: `${propertyName} Mapping Source` },
            valueString: "User Input"
          },
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-mappingPath`, display: `${propertyName} Mapping Path` }], text: `${propertyName} Mapping Path` },
            valueString: ""
          },
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-validation`, display: `${propertyName} Validation` }], text: `${propertyName} Validation` },
            valueString: ""
          },
          {
            type: { coding: [{ system: "http://combinebh.org/fhir/task-inputs", code: `${prefix}-value`, display: `${propertyName} Value` }], text: `${propertyName} Value` },
            valueString: ""
          }
        ]
      }));
    }

    function addOutput() {
      const outputName = prompt("Enter output property name (e.g., Result)");
      if (!outputName) return;
      const prefix = outputName.toLowerCase().replace(/\s+/g, '_');
  
      template.update(current => {
        const updatedTemplate = {
          ...current,
          output: [
            ...(current.output || []),
            {
              type: {
                coding: [{
                  system: "http://combinebh.org/fhir/task-output-types",
                  code: `${prefix}-output`,
                  display: `${outputName} Output`
                }],
                text: `${outputName} Output`
              },
              valueString: ""
            }
          ]
        };
        
        if (!updatedTemplate.output?.length) {
          delete updatedTemplate.output;
        }
        
        return updatedTemplate;
      });
    }

    function cleanTaskForPreview(task) {
        const cleanTask = { ...task };
        
        if (cleanTask.input) {
            cleanTask.input = cleanTask.input.filter(input => 
                input.valueString !== undefined && 
                input.valueString !== null && 
                input.valueString !== ''
            );
            
            if (cleanTask.input.length === 0) {
                delete cleanTask.input;
            }
        }

        if (cleanTask.output) {
            cleanTask.output = cleanTask.output.filter(output => 
                output.valueString !== undefined && 
                output.valueString !== null && 
                output.valueString !== ''
            );
            
            if (cleanTask.output.length === 0) {
                delete cleanTask.output;
            }
        }

        return cleanTask;
    }
    
</script>

<div class="grid grid-cols-2 gap-4 p-4">
  <!-- Template Information -->
  <div class="border rounded-lg p-4 space-y-4">
    <div>
      <label class="label">Template Description</label>
      <input
        type="text"
        class="input w-full"
        placeholder="Enter template description"
        bind:value={$template.description}
        on:input={(e) => template.update(current => ({ 
          ...current, 
          description: e.target.value, 
          id: slugify(e.target.value) 
        }))}
      />
    </div>

    <!-- Display Computed Template ID -->
    <div>
      <label class="label">Template ID</label>
      <input
        type="text"
        class="input w-full bg-gray-100"
        value={$template.id}
        disabled
      />
    </div>

    <div>
      <label class="label">API Path</label>
      <input
        type="text"
        class="input w-full"
        placeholder="Enter API path (e.g., api/email)"
        bind:value={$template.input[0].valueString}
      />
    </div>
  </div>

  <!-- Add Property Button -->
  <div class="flex items-center justify-center">
    <button class="btn btn-primary" on:click={addProperty}>
      <Plus class="w-4 h-4 mr-2" /> Add Property
    </button>
  </div>

  <!-- Add Output Button -->
  <div class="flex items-center justify-center col-span-2">
    <button class="btn btn-primary" on:click={addOutput}>
      <Plus class="w-4 h-4 mr-2" /> Add Output
    </button>
  </div>

  <!-- Properties Section -->
  {#each groupInputs($template.input || []) as property (property.prefix)}
    <PropertyField
      prefix={property.prefix}
      inputs={property.inputs}
      {inputTypes}
      {validationRules}
      {mappingSources}
      {definitionStages}
      {availableTasks}
      {getTaskOutputs}
      on:update={handlePropertyUpdate}
      on:remove={handlePropertyRemove}
    />
  {/each}

  <!-- Outputs Section -->
  {#if $template.output}
    {#each $template.output as output, index (index)}
      <OutputField
        {output}
        {index}
        outputTypes={outputTypes}
        on:update={(e) => updateOutput(index, e.detail)}
        on:remove={() => removeOutput(index)}
      />
    {/each}
  {/if}
</div>

<!-- Preview Section -->
<div class="border rounded-lg p-4 mt-8">
    <h2 class="text-xl font-bold mb-4">Preview</h2>
    <pre class="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(cleanTaskForPreview($template), null, 2)}
    </pre>
</div>



  <style>
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
  