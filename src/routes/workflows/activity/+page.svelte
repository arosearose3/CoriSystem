<script>
    import { createEventDispatcher } from 'svelte';
    import { writable } from 'svelte/store';
    
    const dispatch = createEventDispatcher();
    
    // Property timing definitions
    const timingOptions = [
      { 
        code: 'author',
        display: 'Author Time',
        description: 'Set when creating template',
        allowedSources: ['static', 'default', 'fhirpath']
      },
      {
        code: 'subscribe',
        display: 'Subscribe Time',
        description: 'Set when organization configures workflow',
        allowedSources: ['config', 'endpoint']
      },
      {
        code: 'instance',
        display: 'Instance Time',
        description: 'Set when activity is created',
        allowedSources: ['patient', 'episode', 'assignment', 'fhirpath']
      },
      {
        code: 'execute',
        display: 'Execute Time',
        description: 'Set during runtime execution',
        allowedSources: ['user', 'event', 'activity', 'fhirpath']
      }
    ];
    
    // Property source definitions
    const sourceDefs = {
      // Author Time Sources
      static: { 
        display: 'Static Value',
        description: 'Fixed value set in template',
        inputType: 'text'
      },
      default: {
        display: 'Default Value',
        description: 'Default that can be overridden at subscribe time',
        inputType: 'text'
      },
      
      // Subscribe Time Sources
      config: {
        display: 'Organization Config',
        description: 'Organization-specific setting',
        inputType: 'text',
        placeholder: 'config.path.to.setting'
      },
      endpoint: {
        display: 'Service Endpoint',
        description: 'Organization service URL',
        inputType: 'url',
        placeholder: 'https://api.example.org/service'
      },
      
      // Instance Time Sources
      patient: {
        display: 'Patient Context',
        description: 'Patient-specific data',
        inputType: 'fhirpath',
        placeholder: 'Patient.telecom.where(use=\'mobile\').first().value'
      },
      episode: {
        display: 'Episode Context',
        description: 'Episode of care context',
        inputType: 'fhirpath',
        placeholder: 'EpisodeCare.type'
      },
      assignment: {
        display: 'Resource Assignment',
        description: 'Assigned resources',
        inputType: 'fhirpath',
        placeholder: 'CareTeam.participant.member'
      },
      
      // Execute Time Sources
      user: {
        display: 'Current User',
        description: 'Logged-in user context',
        inputType: 'expression',
        placeholder: 'user.practitioner.reference'
      },
      event: {
        display: 'Event Data',
        description: 'Data from triggering event',
        inputType: 'expression',
        placeholder: 'trigger.payload.resourceId'
      },
      activity: {
        display: 'Activity Result',
        description: 'Result from another activity',
        inputType: 'expression',
        placeholder: 'previousActivity.output.value'
      },
      fhirpath: {
        display: 'FHIRPath Query',
        description: 'Query against FHIR resources',
        inputType: 'fhirpath',
        placeholder: 'Patient.name.given.first()'
      }
    };
    
    // Common FHIR Resources for references
    const COMMON_RESOURCES = [
      'Patient',
      'Practitioner',
      'PractitionerRole',
      'Organization',
      'Questionnaire',
      'ServiceRequest',
      'Condition',
      'Observation',
      'Procedure',
      'Goal',
      'Communication',
      'Task',
      'ServiceRequest'
    ];
    
    let newProperty = {
      name: '',
      isRequired: true,
      timing: 'author',
      source: 'static',
      valueType: 'string',
      value: '',
      description: ''
    };
    
    const taskTemplate = writable({
      resourceType: 'Task',
      meta: {
        profile: ['https://combinebh.org/fhir/ActivityDefinition']
      },
      status: 'draft',
      intent: 'option',
      code: {
        coding: [{
          system: 'https://combinebh.org/fhir/activity-type',
          code: '',
          display: ''
        }]
      },
      description: '',
      input: [],
      output: []
    });
    
    // Get valid sources for selected timing
    $: validSources = timingOptions.find(t => t.code === newProperty.timing)?.allowedSources || [];
    
    function getExpressionLanguage(source) {
      switch(source) {
        case 'fhirpath':
          return 'text/fhirpath';
        case 'config':
          return 'text/config';
        case 'user':
        case 'event':
        case 'activity':
          return 'text/expression';
        default:
          return null;
      }
    }
    
    function addProperty(isOutput = false) {
      if (!newProperty.name) return;
    
      const property = {
        type: {
          text: `${newProperty.name}${newProperty.isRequired ? '-req' : '-opt'}`,
          coding: [
            {
              system: 'https://combinebh.org/fhir/property-timing',
              code: newProperty.timing,
              display: timingOptions.find(t => t.code === newProperty.timing)?.display
            },
            {
              system: 'https://combinebh.org/fhir/property-source',
              code: newProperty.source,
              display: sourceDefs[newProperty.source]?.display
            }
          ]
        }
      };
    
      // Add value based on source type
      const expressionLanguage = getExpressionLanguage(newProperty.source);
      if (expressionLanguage) {
        property.valueExpression = {
          language: expressionLanguage,
          expression: newProperty.value
        };
      } else {
        property.valueString = newProperty.value;
      }
    
      taskTemplate.update(template => {
        const array = isOutput ? template.output : template.input;
        array.push(property);
        return template;
      });
    
      resetNewProperty();
    }
    
    function removeProperty(index, isOutput = false) {
      taskTemplate.update(template => {
        const array = isOutput ? template.output : template.input;
        array.splice(index, 1);
        return template;
      });
    }
    
    function resetNewProperty() {
      newProperty = {
        name: '',
        isRequired: true,
        timing: 'author',
        source: 'static',
        valueType: 'string',
        value: '',
        description: ''
      };
    }
    </script>
    
    <div class="activity-editor">
      <h3>Activity Template Editor</h3>
    
      <div class="basic-info">
        <div class="input-group">
          <label for="activityType">Activity Type *</label>
          <input 
            type="text" 
            id="activityType" 
            bind:value={$taskTemplate.code.coding[0].code}
            placeholder="e.g., send-assessment" 
            required
          />
        </div>
    
        <div class="input-group">
          <label for="description">Description</label>
          <textarea 
            id="description" 
            bind:value={$taskTemplate.description}
            placeholder="Describe the purpose of this activity"
            rows="3"
          />
        </div>
      </div>
    
      <!-- Property Editor -->
      <div class="property-editor">
        <h4>Add Property</h4>
        
        <div class="property-form">
          <div class="form-row">
            <div class="input-group">
              <label for="propertyName">Name</label>
              <input 
                id="propertyName"
                type="text" 
                bind:value={newProperty.name}
                placeholder="e.g., patientContact"
              />
            </div>
    
            <label class="checkbox-group">
              <input 
                type="checkbox" 
                bind:checked={newProperty.isRequired}
              />
              Required
            </label>
          </div>
    
          <div class="form-row">
            <div class="input-group">
              <label for="timing">Evaluation Timing</label>
              <select 
                id="timing" 
                bind:value={newProperty.timing}
                class="timing-select"
              >
                {#each timingOptions as timing}
                  <option value={timing.code}>{timing.display}</option>
                {/each}
              </select>
              <span class="help-text">
                {timingOptions.find(t => t.code === newProperty.timing)?.description}
              </span>
            </div>
    
            <div class="input-group">
              <label for="source">Value Source</label>
              <select 
                id="source" 
                bind:value={newProperty.source}
                class="source-select"
              >
                {#each validSources as sourceCode}
                  <option value={sourceCode}>
                    {sourceDefs[sourceCode].display}
                  </option>
                {/each}
              </select>
              <span class="help-text">
                {sourceDefs[newProperty.source]?.description}
              </span>
            </div>
          </div>
    
          <div class="input-group">
            <label for="value">Value</label>
            {#if sourceDefs[newProperty.source]?.inputType === 'fhirpath'}
              <textarea
                id="value"
                bind:value={newProperty.value}
                placeholder={sourceDefs[newProperty.source]?.placeholder}
                rows="3"
                class="fhirpath-input"
              />
            {:else if sourceDefs[newProperty.source]?.inputType === 'url'}
              <input
                type="url"
                id="value"
                bind:value={newProperty.value}
                placeholder={sourceDefs[newProperty.source]?.placeholder}
              />
            {:else}
              <input
                type="text"
                id="value"
                bind:value={newProperty.value}
                placeholder={sourceDefs[newProperty.source]?.placeholder}
              />
            {/if}
          </div>
    
          <div class="button-row">
            <button class="add-input" on:click={() => addProperty(false)}>
              Add as Input
            </button>
            <button class="add-output" on:click={() => addProperty(true)}>
              Add as Output
            </button>
          </div>
        </div>
      </div>
    
      <!-- Properties Display -->
      <div class="properties-display">
        <div class="inputs-section">
          <h4>Input Properties</h4>
          {#each $taskTemplate.input as input, index}
            <div class="property-item">
              <span class="property-name">{input.type.text}</span>
              <span class="timing-badge">
                {input.type.coding[0].display}
              </span>
              <span class="source-badge">
                {input.type.coding[1].display}
              </span>
              <button 
                class="remove-btn"
                on:click={() => removeProperty(index, false)}
              >×</button>
            </div>
          {/each}
        </div>
    
        <div class="outputs-section">
          <h4>Output Properties</h4>
          {#each $taskTemplate.output as output, index}
            <div class="property-item">
              <span class="property-name">{output.type.text}</span>
              <span class="timing-badge">
                {output.type.coding[0].display}
              </span>
              <span class="source-badge">
                {output.type.coding[1].display}
              </span>
              <button 
                class="remove-btn"
                on:click={() => removeProperty(index, true)}
              >×</button>
            </div>
          {/each}
        </div>
      </div>
    
      <div class="preview-pane">
        <h4>Task Resource Preview</h4>
        <pre>{JSON.stringify($taskTemplate, null, 2)}</pre>
      </div>
    </div>
    
    <style>
    .activity-editor {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .property-editor {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .property-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .help-text {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    
    .timing-select, .source-select {
      padding: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      background: white;
    }
    
    .fhirpath-input {
      font-family: monospace;
      font-size: 14px;
    }
    
    .button-row {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    
    .add-input, .add-output {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .add-input {
      background: #4299e1;
      color: white;
    }
    
    .add-output {
      background: #48bb78;
      color: white;
    }
    
    .property-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .property-name {
      font-weight: 500;
      flex: 1;
    }
    
    .timing-badge, .source-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .timing-badge {
      background: #ebf8ff;
      color: #2b6cb0;
    }
    
    .source-badge {
      background: #f0fff4;
      color: #2f855a;
    }
    
    .remove-btn {
      background: #fc8181;
      color: white;
      border: none;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .preview-pane {
      margin-top: 20px;
      padding: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    
    pre {
      margin: 0;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 14px;
    }
    </style>