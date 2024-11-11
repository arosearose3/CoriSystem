<!-- PlanTemplateManager.svelte -->
<script>
  import { onMount } from 'svelte';
  import EditPlanTemplate from './EditPlanTemplate.svelte';

  let templates = [];
  let isEditing = false;
  let selectedTemplate = null;
  let error = null;

  onMount(async () => {
    await loadTemplates();
  });

  async function loadTemplates() {
    try {
      const response = await fetch('/api/templates/plans/all');
      if (!response.ok) throw new Error('Failed to load templates');
      templates = await response.json();
      error = null;
    } catch (err) {
      error = err.message;
      console.error('Error loading templates:', err);
    }
  }

  function handleAddNew() {
    selectedTemplate = {
      resourceType: 'PlanDefinition',
      usage: 'cori-plan-template',
      status: 'active',
      name: '',
      title: '',
      description: '',
      action: [{
        trigger: [{
          type: 'named-event',
          name: ''
        }],
        definitionCanonical: ''
      }]
    };
    isEditing = true;
  }

  function handleTemplateSelect(template) {
    selectedTemplate = { ...template };
    isEditing = true;
  }

  async function handleTemplateSave(event) {
    const savedTemplate = event.detail;
    await loadTemplates();
    isEditing = false;
    selectedTemplate = null;
  }

  function handleCancel() {
    isEditing = false;
    selectedTemplate = null;
  }
</script>

<div class="plan-template-manager">
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  {#if !isEditing}
    <div class="template-list">
      <h2>Plan Templates</h2>
      <button class="add-button" on:click={handleAddNew}>
        Add Plan Template
      </button>
      
      <div class="templates">
        {#each templates as template}
          <div 
            class="template-item"
            on:click={() => handleTemplateSelect(template)}
          >
            <h3>{template.title || template.name}</h3>
            {#if template.description}
              <p class="description">{template.description}</p>
            {/if}
            
            <div class="event-action-pairs">
              {#each template.action || [] as action}
                <div class="pair">
                  <div class="event">
                    Event: {action.trigger?.[0]?.name || 'Not specified'}
                  </div>
                  <div class="action">
                    Action: {action.definitionCanonical?.split('/')[1] || 'Not specified'}
                  </div>
                </div>
              {/each}
            </div>

            <div class="template-meta">
              <span class="template-id">ID: {template.id}</span>
              <span class="template-version">Version: {template.meta?.versionId || 'N/A'}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <EditPlanTemplate
      template={selectedTemplate}
      on:save={handleTemplateSave}
      on:cancel={handleCancel}
    />
  {/if}
</div>

<style>
  .plan-template-manager {
    padding: 20px;
  }

  .template-list {
    max-width: 800px;
    margin: 0 auto;
  }

  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
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

  .description {
    margin: 0 0 10px 0;
    color: #666;
  }

  .event-action-pairs {
    margin: 10px 0;
  }

  .pair {
    background-color: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .event, .action {
    font-size: 0.9em;
    color: #555;
    margin: 2px 0;
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
</style>