<script>
  import { onMount } from 'svelte';
  import { getAllPlanTemplates } from '$lib/planTemplatesUtils.js';
  import ApprovePlanInstance from './ApprovePlanInstance.svelte';

  let planTemplates = [];
  let selectedTemplate = null;
  let loading = true;
  let error = null;

  // Helper function to extract trigger event name
  function getEventInfo(template) {
    const triggerAction = template.action?.[0];
    const trigger = triggerAction?.trigger?.[0];
    return trigger?.name || 'No event specified';
  }

  // Helper function to extract activity definitions
  function getActivityInfo(template) {
    return template.action
      ?.slice(1) // Skip the trigger action
      ?.map(action => action.definitionCanonical)
      ?.filter(Boolean) || [];
  }

  async function loadPlanTemplates() {
    try {
      loading = true;
      error = null;
      planTemplates = await getAllPlanTemplates();
    } catch (err) {
      console.error('Error loading plan templates:', err);
      error = err.message || 'Failed to load plan templates';
    } finally {
      loading = false;
    }
  }

  function selectPlanTemplate(template) {
    selectedTemplate = template;
  }

  onMount(loadPlanTemplates);
</script>

<div class="container">
  <h2>Choose a Plan Template</h2>

  {#if error}
    <div class="error-message">
      {error}
      <button on:click={loadPlanTemplates}>Retry</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading plan templates...</div>
  {:else if planTemplates.length === 0}
    <div class="empty-state">No plan templates available</div>
  {:else}
    <div class="plan-template-list">
      {#each planTemplates as template (template.id)}
        <div 
          class="plan-template-card" 
          class:selected={selectedTemplate?.id === template.id}
          on:click={() => selectPlanTemplate(template)}
        >
          <h3>{template.title}</h3>
          <div class="template-info">
            <p class="template-description">{template.description || 'No description provided'}</p>
            <div class="template-details">
              <p><strong>Internal Name:</strong> {template.name}</p>
              <p><strong>Event ID:</strong> {getEventInfo(template)}</p>
              <p><strong>Activities:</strong></p>
              {#if getActivityInfo(template).length > 0}
                <ul>
                  {#each getActivityInfo(template) as activity}
                    <li>{activity}</li>
                  {/each}
                </ul>
              {:else}
                <p class="no-activities">No activities configured</p>
              {/if}
            </div>
          </div>
          <div class="last-updated">
            Last updated: {new Date(template.meta?.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if selectedTemplate}
    <div class="selected-template">
      <ApprovePlanInstance {selectedTemplate} />
    </div>
  {/if}
</div>

<style>
  .container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h2 {
    margin-bottom: 2rem;
    color: #2c3e50;
  }

  .plan-template-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .plan-template-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .plan-template-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .plan-template-card.selected {
    border-color: #3b82f6;
    background-color: #f0f9ff;
  }

  .plan-template-card h3 {
    margin: 0 0 1rem 0;
    color: #1a202c;
    font-size: 1.25rem;
  }

  .template-info {
    margin-bottom: 1rem;
  }

  .template-description {
    color: #4a5568;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .template-details {
    font-size: 0.9rem;
  }

  .template-details p {
    margin: 0.5rem 0;
  }

  .template-details ul {
    list-style-type: none;
    padding-left: 1rem;
    margin: 0.5rem 0;
  }

  .template-details li {
    margin: 0.25rem 0;
    color: #4a5568;
  }

  .last-updated {
    font-size: 0.8rem;
    color: #718096;
    margin-top: 1rem;
    text-align: right;
  }

  .error-message {
    background-color: #fee2e2;
    color: #dc2626;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-message button {
    background-color: #dc2626;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-style: italic;
  }

  .no-activities {
    color: #6b7280;
    font-style: italic;
  }

  .selected-template {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
  }
</style>