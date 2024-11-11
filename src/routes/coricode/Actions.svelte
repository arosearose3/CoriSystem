<script>
  import { onMount } from 'svelte';
  import EditActivityTemplate from './EditActivityTemplate.svelte';

  let templates = [];
  let isEditing = false;
  let selectedTemplate = null;
  
  // Available system APIs
  const systemApis = [
    { id: 'email', name: 'Email API', endpoint: '/api/email' },
    { id: 'sms', name: 'SMS API', endpoint: '/api/sms' },
    { id: 'task', name: 'Task API', endpoint: '/api/task' },
    { id: 'notification', name: 'Notification API', endpoint: '/api/notification' }
  ];

  // Available context variables organized by resource type
  const contextVariables = {
    Organization: [
      { id: 'name', path: 'name', type: 'string' },
      { id: 'email', path: 'telecom[type=email].value', type: 'string' },
      { id: 'phone', path: 'telecom[type=phone].value', type: 'string' }
    ],
    Practitioner: [
      { id: 'givenName', path: 'name.given[0]', type: 'string' },
      { id: 'familyName', path: 'name.family', type: 'string' },
      { id: 'email', path: 'telecom[type=email].value', type: 'string' }
    ],
    Patient: [
      { id: 'givenName', path: 'name.given[0]', type: 'string' },
      { id: 'familyName', path: 'name.family', type: 'string' },
      { id: 'birthDate', path: 'birthDate', type: 'date' },
      { id: 'email', path: 'telecom[type=email].value', type: 'string' }
    ]
  };

  onMount(async () => {
    await loadTemplates();
  });

  async function loadTemplates() {
    try {
      const response = await fetch('/api/templates/activities/all');
      templates = await response.json();
    } catch (error) {
      console.error('Error loading templates:', error);
      // Handle error appropriately
    }
  }

  function handleAddNew() {
    selectedTemplate = {
      resourceType: "ActivityDefinition",
      usage: "combine-activity-template",
      status: "active",
      kind: "ServiceRequest",
      name: "",
      description: "",
      dynamicValue: [
        {
          path: "endpoint",
          expression: {
            language: "text/fhirpath",
            expression: ""
          }
        }
      ]
    };
    isEditing = true;
  }

  function getEndpointFromTemplate(template) {
    const endpointValue = template.dynamicValue?.find(dv => dv.path === 'endpoint');
    if (!endpointValue) return 'Unknown';
    const endpoint = endpointValue.expression.expression.replace(/['"]/g, '');
    const api = systemApis.find(api => api.endpoint === endpoint);
    return api ? api.name : endpoint;
  }

  function handleTemplateSelect(template) {
    selectedTemplate = { ...template };
    isEditing = true;
  }

  async function handleTemplateSave(event) {
    const savedTemplate = event.detail;
    await loadTemplates(); // Refresh list
    isEditing = false;
    selectedTemplate = null;
  }

  function handleCancel() {
    isEditing = false;
    selectedTemplate = null;
  }
</script>

<div class="activity-template-manager">
  {#if !isEditing}
    <div class="template-list">
      <h2>Activity Templates</h2>
      <button class="add-button" on:click={handleAddNew}>
        Add Template
      </button>
      
      <div class="templates">
        {#each templates as template}
          <div 
            class="template-item"
            on:click={() => handleTemplateSelect(template)}
          >
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <div class="api-info">
              API: {getEndpointFromTemplate(template)}
            </div>
            <div class="template-meta">
              <span class="template-id">ID: {template.id}</span>
              <span class="template-version">Version: {template.meta?.versionId || 'N/A'}</span>
            </div>
            {#if template.dynamicValue && template.dynamicValue.length > 1}
              <div class="parameters-info">
                Parameters:
                <ul>
                  {#each template.dynamicValue.filter(dv => dv.path !== 'endpoint') as param}
                    <li>
                      {param.path}: 
                      {param.expression.expression.startsWith('%') 
                        ? `From ${param.expression.expression}` 
                        : 'Template defined'}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <EditActivityTemplate
      template={selectedTemplate}
      systemApis={systemApis}
      contextVariables={contextVariables}
      on:save={handleTemplateSave}
      on:cancel={handleCancel}
    />
  {/if}
</div>

<style>
  .activity-template-manager {
    padding: 20px;
  }

  .template-list {
    max-width: 800px;
    margin: 0 auto;
  }

  .add-button {
    margin: 20px 0;
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .templates {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .template-item {
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: box-shadow 0.3s ease;
    background-color: white;
  }

  .template-item:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .template-item h3 {
    margin: 0 0 10px 0;
    color: #2c3e50;
  }

  .template-item p {
    margin: 0 0 10px 0;
    color: #666;
  }

  .api-info {
    font-size: 0.9em;
    color: #666;
    margin-bottom: 10px;
    padding: 5px;
    background-color: #f8f9fa;
    border-radius: 3px;
  }

  .template-meta {
    display: flex;
    gap: 15px;
    font-size: 0.8em;
    color: #888;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }

  .parameters-info {
    margin-top: 10px;
    font-size: 0.9em;
  }

  .parameters-info ul {
    margin: 5px 0 0 0;
    padding-left: 20px;
    list-style-type: none;
  }

  .parameters-info li {
    color: #666;
    margin: 3px 0;
  }
</style>