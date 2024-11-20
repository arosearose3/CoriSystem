<!-- EditActivityTemplate.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  
  export let template;
  export let systemApis;
  export let contextVariables;
  
  const dispatch = createEventDispatcher();
  
  let name = template.name;
  let description = template.description;
  let useCustomApi = false; 
  let customApiEndpoint = ''; 
  let selectedApi = systemApis.find(api => api.endpoint === getEndpointFromTemplate(template)) || systemApis[0];
  let parameters = initializeParameters(template);
  let isSaving = false;
  let errorMessage = '';

    // When initializing from an existing template, verify it's actually a template
    onMount(() => {
    const templateEndpoint = getEndpointFromTemplate(template);
    if (template.id && !isTemplate(template)) {
      errorMessage = 'Warning: Editing an ActivityDefinition that is not marked as a template';
    }
    
    // Check if the template uses a custom API
    if (templateEndpoint && !systemApis.some(api => api.endpoint === templateEndpoint)) {
      useCustomApi = true;
      customApiEndpoint = templateEndpoint;
      selectedApi = null;
    }
  });

    // Helper to check if a resource is a template
    function isTemplate(resource) {
    return resource.usage === 'combine-activity-template';
  }

  // Helper to get endpoint from template's dynamicValue
  function getEndpointFromTemplate(template) {
    const endpointValue = template.dynamicValue?.find(dv => dv.path === 'endpoint');
    return endpointValue?.expression?.expression?.replace(/['"]/g, '') || '';
  }

  // Initialize parameters from template's dynamicValue, excluding endpoint
  function initializeParameters(template) {
    if (!template.dynamicValue) return [];
    
    return template.dynamicValue
      .filter(dv => dv.path !== 'endpoint')
      .map(dv => {
        const expression = dv.expression.expression;
        const isContext = expression.startsWith('%');
        
        if (isContext) {
          const [resource, field] = expression.slice(1).split('.');
          return {
            name: dv.path,
            required: true,
            source: 'context',
            value: '',
            contextResource: resource,
            contextField: field
          };
        } else {
          return {
            name: dv.path,
            required: true,
            source: 'template',
            value: expression.replace(/['"]/g, ''),
            contextResource: '',
            contextField: ''
          };
        }
      });
  }

  function addParameter() {
    parameters = [...parameters, {
      name: '',
      required: true,
      source: 'template',
      value: '',
      contextResource: '',
      contextField: ''
    }];
  }
  
  function removeParameter(index) {
    parameters = parameters.filter((_, i) => i !== index);
  }

  function handleParameterSourceChange(parameter) {
    if (parameter.source === 'template') {
      parameter.contextResource = '';
      parameter.contextField = '';
    } else {
      parameter.value = '';
    }
    parameters = [...parameters];
  }
  
  function transformToFhirResource() {
    // Get the endpoint based on whether custom API is being used
    const endpoint = useCustomApi ? customApiEndpoint : selectedApi?.endpoint;
    
    const dynamicValue = [
      {
        path: 'endpoint',
        expression: {
          language: 'text/fhirpath',
          expression: `'${endpoint}'`
        }
      },
      ...parameters.map(param => ({
        path: param.name,
        expression: {
          language: 'text/fhirpath',
          expression: param.source === 'template' 
            ? `'${param.value}'`
            : `%${param.contextResource}.${param.contextField}`
        }
      }))
    ];

    const fhirResource = {
      resourceType: "ActivityDefinition",
      usage: "combine-activity-template",
      status: "active",
      kind: "ServiceRequest",
      name: name,
      description: description,
      dynamicValue: dynamicValue
    };

    if (template.id) {
      fhirResource.id = template.id;
    }

    return fhirResource;
  }

  async function handleSubmit() {
    isSaving = true;
    errorMessage = '';
    
    try {
      const fhirResource = transformToFhirResource();
      let response;
      
      if (template.id) {
        response = await fetch(`/api/templates/activities/${template.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fhirResource)
        });
      } else {
        response = await fetch('/api/templates/activities/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fhirResource)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save template');
      }

      const savedTemplate = await response.json();
      dispatch('save', savedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      errorMessage = error.message || 'Failed to save template. Please try again.';
    } finally {
      isSaving = false;
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="edit-template">
  <h2>{template.id ? 'Edit' : 'Add'} Activity Template</h2>
  
  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {/if}
  
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="name">Name</label>
      <input 
        id="name"
        type="text"
        bind:value={name}
        required
      />
    </div>
    
    <div class="form-group">
      <label for="description">Description</label>
      <textarea
        id="description"
        bind:value={description}
        rows="3"
      ></textarea>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input 
          type="checkbox"
          bind:checked={useCustomApi}
        />
        Use Custom API Endpoint
      </label>
    </div>
    
    {#if useCustomApi}
      <div class="form-group">
        <label for="customApi">Custom API Endpoint</label>
        <input 
          id="customApi"
          type="text"
          bind:value={customApiEndpoint}
          placeholder="Enter API endpoint URL"
          required
        />
      </div>
    {:else}
      <div class="form-group">
        <label for="api">System API</label>
        <select 
          id="api" 
          bind:value={selectedApi} 
          required
        >
          <option value="">Select API</option>
          {#each systemApis as api}
            <option value={api}>{api.name} ({api.endpoint})</option>
          {/each}
        </select>
      </div>
    {/if}
    
    
    <div class="parameters">
      <h3>Parameters</h3>
      <button type="button" class="add-param-button" on:click={addParameter}>
        Add Parameter
      </button>
      
      {#each parameters as parameter, i}
        <div class="parameter">
          <div class="form-group">
            <label>Parameter Name</label>
            <input
              type="text"
              bind:value={parameter.name}
              required
            />
          </div>
          
          <div class="form-group">
            <label>Required</label>
            <input
              type="checkbox"
              bind:checked={parameter.required}
            />
          </div>
          
          <div class="form-group">
            <label>Source</label>
            <select 
              bind:value={parameter.source}
              on:change={() => handleParameterSourceChange(parameter)}
            >
              <option value="template">Template Value</option>
              <option value="context">Context Variable</option>
            </select>
          </div>
          
          {#if parameter.source === 'template'}
            <div class="form-group">
              <label>Value</label>
              <input
                type="text"
                bind:value={parameter.value}
                required
              />
            </div>
          {:else}
            <div class="form-group">
              <label>Resource Type</label>
              <select 
                bind:value={parameter.contextResource}
                required
              >
                <option value="">Select Resource</option>
                {#each Object.keys(contextVariables) as resource}
                  <option value={resource}>{resource}</option>
                {/each}
              </select>
            </div>
            
            {#if parameter.contextResource}
              <div class="form-group">
                <label>Field</label>
                <select 
                  bind:value={parameter.contextField}
                  required
                >
                  <option value="">Select Field</option>
                  {#each contextVariables[parameter.contextResource] as field}
                    <option value={field.id}>{field.id}</option>
                  {/each}
                </select>
              </div>
            {/if}
          {/if}
          
          <button 
            type="button" 
            class="remove-button"
            on:click={() => removeParameter(i)}
          >
            Remove
          </button>
        </div>
      {/each}
    </div>
    
    <div class="actions">
      <button 
        type="submit" 
        disabled={isSaving}
      >
        {#if isSaving}
          Saving...
        {:else}
          Save Template
        {/if}
      </button>
      <button 
        type="button" 
        on:click={handleCancel}
        disabled={isSaving}
      >
        Cancel
      </button>
    </div>
  </form>
</div>

<style>
  .edit-template {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  input[type="text"],
  textarea,
  select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .parameters {
    margin-top: 20px;
    border-top: 1px solid #ddd;
    padding-top: 20px;
  }

  .parameter {
    margin-top: 15px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #f9f9f9;
  }

  .add-param-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    margin-bottom: 15px;
    cursor: pointer;
  }

  .remove-button {
    background-color: #ff4444;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    margin-top: 10px;
  }

  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .actions button[type="submit"] {
    background-color: #4CAF50;
    color: white;
  }

  .actions button[type="button"] {
    background-color: #666;
    color: white;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }
</style>