<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { base } from '$app/paths'; 
  import Plus from 'lucide-svelte/icons/plus';
  import PropertyField from './InputField.svelte';
  import OutputField from './OutputField.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let selectedTemplate;
  console.log('ActivityDefinitionEditor initializing with selectedTemplate:', selectedTemplate);

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
            description: '',
            id: '',
            status: 'draft',  // Default status
            kind: 'Task',     // Default kind
            name: '',
            title: '',
            dynamicValue: [{  // Default API path configuration
                path: "/Task/apiPath",
                expression: {
                    language: "text/fhirpath",
                    expression: "",
                    name: "apiPath"
                }
            }]
        });

    // Populate existing values when the component mounts or when selectedTemplate changes
    $: {
    console.log('ActivityDefinitionEditor reactive: selectedTemplate changed:', selectedTemplate);
    activityDefinition.set({
        resourceType: "ActivityDefinition",
        description: '',
        id: '',
        status: 'draft',
        kind: 'Task',
        name: '',
        title: '',
        dynamicValue: [{
            path: "/Task/apiPath",
            expression: {
                language: "text/fhirpath",
                expression: "",
                name: "apiPath"
            }
        }],
        ...(selectedTemplate || {})
    });
}

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


  function setupResponsePaths() {
    activityDefinition.update(current => {
        const prefix = slugify(current.name);
        
        const responsePathConfig = [
            // Mark this as an async task
            {
                path: "/Task/async/type",
                expression: {
                    language: "text/fhirpath",
                    expression: "approval",
                    name: "async-type"
                }
            },
            // Define valid responses
            {
                path: "/Task/async/validResponses",
                expression: {
                    language: "text/fhirpath",
                    expression: "['approved', 'rejected']",
                    name: "valid-responses"
                }
            },
            // Configure the request tracking
            {
                path: "/Task/async/tracking/requestId",
                expression: {
                    language: "text/fhirpath",
                    expression: "Task.identifier.where(system='urn:uuid')",
                    name: "request-tracking"
                }
            },
            // Configure response handling
            {
                path: "/Task/async/responseHandler",
                expression: {
                    language: "text/fhirpath",
                    expression: "Task.output.responseResult",
                    name: "response-handler"
                }
            },
            // Task status tracking
            {
                path: "/Task/output[status]/name",
                expression: {
                    language: "text/fhirpath",
                    expression: "status",
                    name: `${prefix}-status-name`
                }
            },
            {
                path: "/Task/output[status]/type",
                expression: {
                    language: "text/fhirpath",
                    expression: "string",
                    name: `${prefix}-status-type`
                }
            }
        ];

        return {
            ...current,
            dynamicValue: [...current.dynamicValue, ...responsePathConfig]
        };
    });
}

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
                path: `/Task/input[${prefix}]/value`,
                expression: {
                    language: "text/fhirpath",
                    expression: "",  // This will be updated when the user enters a value
                    name: `${prefix}-value`
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
        const fhirResource = prepareFhirResource($activityDefinition);
        const response = await fetch(`${base}/api/activitydefinition/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fhirResource)
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

function getFormattedOutputs(dynamicValues) {
    if (!dynamicValues) return {};
    
    const outputs = {};
    dynamicValues
        .filter(dv => dv.path.includes('/output['))
        .forEach(dv => {
            const match = dv.path.match(/output\[(.*?)\]/);
            if (!match) return;
            
            const outputName = match[1];
            const property = dv.path.split('/').pop();
            
            if (!outputs[outputName]) {
                outputs[outputName] = {};
            }
            
            if (property === 'type') {
                outputs[outputName].type = dv.expression.expression;
            } else if (property === 'name') {
                outputs[outputName].name = dv.expression.expression;
            } else if (property === 'expression') {
                outputs[outputName].expression = dv.expression.expression;
            }
        });
    
    return outputs;
}

function getFormattedInputs(dynamicValues) {
    if (!dynamicValues) return [];

    const inputs = {};
    
    dynamicValues.forEach(dv => {
        if (!dv.path.includes('/input[')) return;
        
        const match = dv.path.match(/input\[(.*?)\]/);
        if (!match) return;
        
        const inputName = match[1];
        const property = dv.path.split('/').pop();
        
        if (!inputs[inputName]) {
            inputs[inputName] = {};
        }
        
        switch(property) {
            case 'type':
                inputs[inputName].type = dv.expression.expression;
                break;
            case 'definedAt':
                inputs[inputName].definedAt = dv.expression.expression;
                break;
            case 'mappingSource':
                inputs[inputName].mappingSource = dv.expression.expression;
                break;
            case 'value':
                inputs[inputName].value = dv.expression.expression;
                break;
        }
    });
    
    return Object.entries(inputs).map(([name, properties]) => ({
        name,
        ...properties
    }));
}

// Update the cleanForPreview function
function cleanForPreview(def) {
// Use this EVERYWHERE instead of current checks:
    const isResponsePath = def.dynamicValues?.some(dv => dv.path === '/Task/async/type');

    if (!isResponsePath) {
        return {
            resourceType: def.resourceType,
            id: def.id,
            name: def.name,
            title: def.title,
            description: def.description,
            status: def.status,
            kind: def.kind,
            dynamicValue: def.dynamicValue.filter(dv => 
                dv.expression?.expression && 
                dv.expression.expression.trim() !== ''
            )
        };
    }

    // Organize response path preview
    return {
        resourceType: def.resourceType,
        id: def.id,
        name: def.name,
        title: def.title,
        description: def.description,
        status: def.status,
        kind: def.kind,
        async: {
            type: def.dynamicValue.find(dv => 
                dv.path === '/Task/async/type'
            )?.expression.expression,
            validResponses: def.dynamicValue.find(dv => 
                dv.path === '/Task/async/validResponses'
            )?.expression.expression,
            tracking: {
                requestId: def.dynamicValue.find(dv => 
                    dv.path === '/Task/async/tracking/requestId'
                )?.expression.expression,
                responseHandler: def.dynamicValue.find(dv => 
                    dv.path === '/Task/async/responseHandler'
                )?.expression.expression
            }
        },
        inputs: getFormattedInputs(def.dynamicValue),
        outputs: getFormattedOutputs(def.dynamicValue)
    };
}

// Add this new function
function prepareFhirResource(def) {
    const fhirResource = {
        resourceType: "ActivityDefinition",
        id: def.id,
        name: def.name,
        title: def.title,
        description: def.description,
        status: def.status,
        kind: def.kind,
        date: new Date().toISOString(),
        dynamicValue: []
    };

    // Add API endpoint configuration
    const apiPath = def.dynamicValue.find(dv => 
        dv.expression.name === 'apiPath'
    );
    if (apiPath) {
        fhirResource.dynamicValue.push(apiPath);
    }

    // Add all async/response path configurations first
    const asyncConfig = def.dynamicValue.filter(dv => 
        dv.path.startsWith('/Task/async/')
    );
    if (asyncConfig.length > 0) {
        fhirResource.dynamicValue.push(...asyncConfig);
    }

    // Add input configurations
    def.dynamicValue
        .filter(dv => dv.path.includes('/input['))
        .forEach(dv => {
            fhirResource.dynamicValue.push(dv);
        });

    // Add output configurations
    def.dynamicValue
        .filter(dv => dv.path.includes('/output['))
        .forEach(dv => {
            fhirResource.dynamicValue.push(dv);
        });

    return fhirResource;
}


function generateApiTemplate(activityDef) {
    const prefix = slugify(activityDef.name);
    const hasResponsePaths = activityDef.isResponseNode;
    
    if (hasResponsePaths) {
        return `// Response Path API Implementation for ${activityDef.title}
import { updateTask, generateSecureToken, validateToken } from './utils';

// Main endpoint that initiates the async operation
export async function handle${prefix}(req, res) {
    try {
        const task = req.body;
        
        // Generate secure tokens for response endpoints
        const responseTokens = {
            requestId: generateSecureToken(),
            approved: generateSecureToken({
                taskId: task.id,
                response: 'approved'
            }),
            rejected: generateSecureToken({
                taskId: task.id,
                response: 'rejected'
            })
        };

        // Create the response URLs
        const baseUrl = process.env.API_BASE_URL;
        const responseUrls = {
            approved: \`\${baseUrl}/response/\${responseTokens.approved}\`,
            rejected: \`\${baseUrl}/response/\${responseTokens.rejected}\`
        };

        // Parse inputs from task
        const inputs = {};
        ${activityDef.dynamicValue
            .filter(dv => dv.path.includes('/input['))
            .map(dv => `        // ${dv.expression.name}
        inputs['${dv.expression.name}'] = task.input.find(i => i.name === '${dv.expression.name}')?.valueString;`)
            .join('\n')}

        // TODO: Implement your async operation (e.g., send email with response links)
        await executeOperation(inputs, responseUrls);

        // Update task with initial status
        await updateTask(task.id, {
            status: 'in-progress',
            outputs: [
                {
                    name: 'sent',
                    valueBoolean: true
                },
                {
                    name: 'requestId',
                    valueString: responseTokens.requestId
                }
            ]
        });

        return res.status(200).json({
            status: 'in-progress',
            requestId: responseTokens.requestId
        });

    } catch (error) {
        console.error('Error in ${prefix}:', error);
        return res.status(500).json({
            status: 'failed',
            error: error.message
        });
    }
}

// Endpoint that handles the response
export async function handle${prefix}Response(req, res) {
    try {
        const token = req.params.token;
        const tokenData = await validateToken(token);
        
        if (!tokenData) {
            throw new Error('Invalid or expired token');
        }

        // Update the task with the response
        await updateTask(tokenData.taskId, {
            status: 'completed',
            outputs: [
                {
                    name: 'responseResult',
                    valueString: tokenData.response
                }
            ]
        });

        // Show confirmation page to user
        return res.render('response-confirmation', {
            response: tokenData.response
        });

    } catch (error) {
        console.error('Error handling response:', error);
        return res.render('error-page', {
            error: 'Unable to process response'
        });
    }
}`;
    } else {
        return `// Simple Activity Implementation for ${activityDef.title}
import { updateTask } from './utils';

export async function handle${prefix}(req, res) {
    try {
        const task = req.body;
        
        // Parse inputs from task
        const inputs = {};
        ${activityDef.dynamicValue
            .filter(dv => dv.path.includes('/input['))
            .map(dv => `        // ${dv.expression.name}
        inputs['${dv.expression.name}'] = task.input.find(i => i.name === '${dv.expression.name}')?.valueString;`)
            .join('\n')}

        // TODO: Implement your operation here
        const result = await executeOperation(inputs);

        // Format outputs
        const outputs = [
            ${activityDef.dynamicValue
                .filter(dv => dv.path.includes('/output['))
                .map(dv => `{
                name: '${dv.expression.name}',
                valueString: result.${dv.expression.name}
            }`).join(',\n            ')}
        ];

        // Update task with outputs
        await updateTask(task.id, {
            status: 'completed',
            outputs
        });

        return res.status(200).json({
            status: 'completed',
            outputs
        });

    } catch (error) {
        console.error('Error in ${prefix}:', error);
        return res.status(500).json({
            status: 'failed',
            error: error.message
        });
    }
}`;
    }
}


</script>


<div class="activity-editor">
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

      <div>
        <label class="label">Response Path Activity</label>
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                class="checkbox"
                bind:checked={$activityDefinition.isResponseNode}
                on:change={(e) => {
                    if (e.target.checked) {
                        setupResponsePaths();
                    } else {
                        // Remove response path configuration
                        activityDefinition.update(current => ({
                            ...current,
                            dynamicValue: current.dynamicValue.filter(dv => 
                                !dv.path.includes('-response') &&
                                !dv.path.includes('-sent') &&
                                !dv.path.includes('-requestid')
                            )
                        }));
                    }
                }}
            />
            <span>This activity creates response paths</span>
        </div>
    </div>

    <!-- Add info box when response paths are enabled -->
        {#if $activityDefinition.isResponseNode}
        <div class="info-box p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
            <h4 class="font-semibold mb-2">Response Path Configuration</h4>
            <p class="text-sm">This activity will automatically create:</p>
            <ul class="list-disc ml-4 text-sm">
                <li>A 'sent' output to confirm delivery</li>
                <li>A 'responseResult' output for the response value</li>
                <li>A 'requestId' output for tracking</li>
            </ul>
        </div>
        {/if}



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
<!-- Preview Section -->
<div class="border rounded-lg p-4 mt-8">
    <h2 class="text-xl font-bold mb-4">Preview</h2>
    
    {#if $activityDefinition.isResponseNode}
        <div class="preview-sections">
            <div class="preview-section">
                <h3 class="preview-header">Basic Information</h3>
                <div class="preview-content">
                    <div class="preview-item">
                        <span class="preview-label">Name:</span>
                        <span>{$activityDefinition.name}</span>
                    </div>
                    <div class="preview-item">
                        <span class="preview-label">API Endpoint:</span>
                        <span>{$activityDefinition.dynamicValue[0]?.expression?.expression}</span>
                    </div>
                </div>
            </div>

            <div class="preview-section">
                <h3 class="preview-header">Response Path Configuration</h3>
                <div class="preview-content">
                    <div class="preview-subsection">
                        <h4 class="preview-subheader">Standard Outputs</h4>
                        <div class="preview-item">
                            <span class="preview-label">sent:</span>
                            <span>boolean - Confirms request delivery</span>
                        </div>
                    </div>
                    <div class="preview-subsection">
                        <h4 class="preview-subheader">Response Outputs</h4>
                        <div class="preview-item">
                            <span class="preview-label">responseResult:</span>
                            <span>string - Final response value</span>
                        </div>
                        <div class="preview-item">
                            <span class="preview-label">requestId:</span>
                            <span>string - Request tracking ID</span>
                        </div>
                    </div>
                </div>
            </div>

            {#if groupInputs($activityDefinition.dynamicValue).length > 0}
                <div class="preview-section">
                    <h3 class="preview-header">Custom Inputs</h3>
                    <div class="preview-content">
                        {#each groupInputs($activityDefinition.dynamicValue) as input}
                            <div class="preview-item">
                                <span class="preview-label">{input.prefix}:</span>
                                <span>{input.dynamicValues.find(dv => dv.path.includes('/type'))?.expression.expression || 'string'}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {:else}

    {/if}
    <pre class="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(cleanForPreview($activityDefinition), null, 2)}
    </pre>
</div>

<div class="border rounded-lg p-4 mt-8">
    <h2 class="text-xl font-bold mb-4">API Implementation Template</h2>
    <div class="bg-gray-100 p-4 rounded">
        <pre class="overflow-auto text-sm font-mono whitespace-pre">{generateApiTemplate($activityDefinition)}</pre>
    </div>
    <div class="mt-4 text-sm text-gray-600">
        <p>Copy this template to use as a starting point for implementing your API endpoint.</p>
        <p class="mt-2">Remember to:</p>
        <ul class="list-disc ml-6 mt-1">
            <li>Implement the executeOperation function with your actual business logic</li>
            <li>Add appropriate error handling</li>
            <li>Add input validation as needed</li>
            <li>Update the response handling for your specific needs</li>
        </ul>
    </div>
  </div>
</div>

  <style>

.activity-editor {
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: white;
    overflow-y: auto;
}

.checkbox {
    width: 1rem;
    height: 1rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    cursor: pointer;
}

.info-box {
    background-color: #EFF6FF;
    border-color: #BFDBFE;
    color: #1E40AF;
}


.font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.whitespace-pre {
    white-space: pre;
}

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

    .preview-sections {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .preview-section {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
    }

    .preview-header {
        background-color: #f8fafc;
        padding: 0.75rem;
        font-weight: 600;
        border-bottom: 1px solid #e5e7eb;
    }

    .preview-content {
        padding: 1rem;
    }

    .preview-subsection {
        margin-bottom: 1rem;
    }

    .preview-subheader {
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: #4b5563;
    }

    .preview-item {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .preview-label {
        font-family: monospace;
        color: #4b5563;
        min-width: 120px;
    }

  </style>
  