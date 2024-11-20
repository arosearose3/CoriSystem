<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import JsonFormatter from './JsonFormatter.svelte';

  export let template;

  const dispatch = createEventDispatcher();
  let isSaving = false;
  let errorMessage = '';
  let showPreview = false;
  let previewResource = null;

  // Local state for form
  let name = template.name;
  let title = template.title || '';
  let description = template.description || '';
  let actions = template.action || [
    {
      trigger: [{ type: 'named-event', name: '' }]
    }
  ];

  // Available templates
  let eventTemplates = [];
  let webhookEndpoints = [];
  let activityTemplates = [];
  let isLoading = true;
  let selectedEventTemplateId = actions[0]?.trigger[0]?.name || '';

  onMount(async () => {
    try {
      const [eventResponse, webhookResponse, activityResponse] = await Promise.all([
        fetch('/api/templates/events/all'),
        fetch('/api/webhook/all'),
        fetch('/api/templates/activities/all')
      ]);

      if (!eventResponse.ok || !webhookResponse.ok || !activityResponse.ok) {
        throw new Error('Failed to load templates');
      }

      const rawEventTemplates = await eventResponse.json();
      const webhooks = await webhookResponse.json();
      
      // Process standard event templates
      eventTemplates = processEventTemplates(rawEventTemplates);
      
      // Add webhook endpoints as event options
      webhookEndpoints = webhooks.entry?.map(e => e.resource).map(endpoint => ({
        id: endpoint.id,
        name: endpoint.name,
        type: 'named-event',
        displayName: `Webhook: ${endpoint.name}`
      })) || [];
      
      // Combine both types of events
      eventTemplates = [...eventTemplates, ...webhookEndpoints];
      
      activityTemplates = await activityResponse.json();
      isLoading = false;
    } catch (error) {
      console.error('Error loading templates:', error);
      errorMessage = 'Failed to load templates. Please try again.';
      isLoading = false;
    }
  });

  function processEventTemplates(rawTemplates) {
      return rawTemplates.map(template => ({
          id: template.id,
          name: template.extension?.[0]?.extension?.find(e => e.url === 'name')?.valueString || '',
          description: template.extension?.[0]?.extension?.find(e => e.url === 'description')?.valueString || '',
          type: template.extension?.[0]?.extension?.find(e => e.url === 'type')?.valueString || '',
          resourceType: template.extension?.[0]?.extension?.find(e => e.url === 'resourceType')?.valueString || '',
          operation: template.extension?.[0]?.extension?.find(e => e.url === 'operation')?.valueString || '',
          displayName: `${template.extension?.[0]?.extension?.find(e => e.url === 'name')?.valueString || ''} 
                       (${template.extension?.[0]?.extension?.find(e => e.url === 'type')?.valueString || ''}: 
                       ${template.extension?.[0]?.extension?.find(e => e.url === 'resourceType')?.valueString || ''} 
                       ${template.extension?.[0]?.extension?.find(e => e.url === 'operation')?.valueString || ''})`
      }));
  }

  function createFhirResource() {
    const selectedEventTemplate = eventTemplates.find(et => et.id === selectedEventTemplateId);
    
    const resource = {
      resourceType: 'PlanDefinition',
      name,
      title,
      description,
      status: 'active',
      usage: 'cori-plan-template',
      action: []
    };

    if (selectedEventTemplate) {
      resource.action.push({
        trigger: [{
          type: selectedEventTemplate.type === 'webhook-event' ? 'webhook-event' : 'named-event',
          name: selectedEventTemplate.id
        }]
      });
    }

    const activityActions = actions
      .slice(1)
      .filter(action => action.definitionCanonical)
      .map(action => ({
        definitionCanonical: action.definitionCanonical
      }));

    resource.action.push(...activityActions);
    return resource;
  }

  function updatePreview() {
      previewResource = createFhirResource();
  }

  function togglePreview() {
      showPreview = !showPreview;
      if (showPreview && !previewResource) {
          updatePreview();
      }
  }

  function addAction() {
      actions = [...actions, { definitionCanonical: '' }];
  }

  function removeAction(index) {
      if (index === 0) return;
      actions = actions.filter((_, i) => i !== index);
  }

  async function handleSubmit() {
      isSaving = true;
      errorMessage = '';

      try {
          const planDefinition = createFhirResource();

          let response;
          if (template.id) {
              planDefinition.id = template.id;
              response = await fetch(`/api/templates/plans/${template.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(planDefinition)
              });
          } else {
              response = await fetch('/api/templates/plans/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(planDefinition)
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

  function handleEventTemplateChange(event) {
      selectedEventTemplateId = event.target.value;
      actions[0] = {
          trigger: [
              {
                  type: 'named-event',
                  name: selectedEventTemplateId
              }
          ]
      };
      actions = [...actions];
  }

  function handleActionDefinitionCanonicalChange(index, value) {
      actions = actions.map((action, i) => {
          if (i === index) {
              return { ...action, definitionCanonical: value };
          }
          return action;
      });
  }
</script>

<div class="edit-plan-template">
  <h2>{template.id ? 'Edit' : 'Add'} Plan Template</h2>

  <div class="preview-controls">
      <button type="button" class="preview-button" on:click={togglePreview}>
          {showPreview ? 'Hide' : 'Show'} Preview
      </button>
      {#if showPreview}
          <button type="button" class="update-preview-button" on:click={updatePreview}>
              Update Preview
          </button>
      {/if}
  </div>

  {#if showPreview && previewResource}
      <div class="preview-container">
          <h3>FHIR Resource Preview</h3>
          <JsonFormatter json={previewResource} />
      </div>
  {/if}

  {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
  {/if}

  {#if isLoading}
      <div class="loading">Loading templates...</div>
  {:else}
      <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
              <label for="name">Name (internal identifier)</label>
              <input id="name" type="text" bind:value={name} required />
          </div>

          <div class="form-group">
              <label for="title">Title (display name)</label>
              <input id="title" type="text" bind:value={title} required />
          </div>

          <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" bind:value={description} rows="3"></textarea>
          </div>

          <div class="event-action-pairs">
              <h3>Trigger Event and Actions</h3>

              <div class="pair">
                  <div class="pair-header">
                      <h4>Trigger Event</h4>
                  </div>

                  <div class="form-group">
                      <label>Event Template</label>
                      <select
                          value={selectedEventTemplateId}
                          on:change={handleEventTemplateChange}
                          required
                      >
                          <option value="">Select Event Template</option>
                          {#each eventTemplates as eventTemplate}
                              <option value={eventTemplate.id}>
                                  {eventTemplate.displayName}
                              </option>
                          {/each}
                      </select>
                  </div>
              </div>

              <button type="button" class="add-pair-button" on:click={addAction}>
                  Add Activity
              </button>

              {#each actions.slice(1) as action, i}
                  <div class="pair">
                      <div class="pair-header">
                          <h4>Activity {i + 1}</h4>
                          <button
                              type="button"
                              class="remove-button"
                              on:click={() => removeAction(i + 1)}
                          >
                              Remove
                          </button>
                      </div>

                      <div class="form-group">
                          <label>Activity Template</label>
                          <select
                              value={action.definitionCanonical}
                              required
                              on:change={(event) =>
                                  handleActionDefinitionCanonicalChange(
                                      i + 1,
                                      event.target.value
                                  )}
                          >
                              <option value="">Select Activity Template</option>
                              {#each activityTemplates as activityTemplate}
                                  <option value={`ActivityDefinition/${activityTemplate.id}`}>
                                      {activityTemplate.name} - {activityTemplate.description}
                                  </option>
                              {/each}
                          </select>
                      </div>
                  </div>
              {/each}
          </div>

          <div class="actions">
              <button type="submit" disabled={isSaving} class="save-button">
                  {isSaving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                  type="button"
                  on:click={() => dispatch('cancel')}
                  disabled={isSaving}
                  class="cancel-button"
              >
                  Cancel
              </button>
          </div>
      </form>
  {/if}
</div>

<style>
  .edit-plan-template {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .preview-controls {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-bottom: 15px;
  }

  .preview-button,
  .update-preview-button {
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
  }

  .update-preview-button {
    background-color: #4CAF50;
  }

  /* Rest of the styles remain the same */
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

  .event-action-pairs {
    margin-top: 20px;
    border-top: 1px solid #ddd;
    padding-top: 20px;
  }

  .pair {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
  }

  .pair-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .add-pair-button {
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
  }

  .preview-container {
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 20px;
  }

  .actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .save-button,
  .cancel-button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .save-button {
    background-color: #4CAF50;
    color: white;
  }

  .cancel-button {
    background-color: #666;
    color: white;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .loading {
    text-align: center;
    padding: 20px;
    color: #666;
  }
</style>