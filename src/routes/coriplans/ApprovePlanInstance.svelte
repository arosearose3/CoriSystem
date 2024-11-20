<script>
  import { onMount } from 'svelte';
  import { createPlanInstance, getEventTemplate ,getActivityTemplate } from '$lib/planTemplatesUtils.js';
  import { user } from '$lib/stores.js';
  import { goto } from '$app/navigation';

  export let selectedTemplate;

  let loading = false;
  let errorMessage = null;
  let showPreview = false;
  let previewData = null;
  let eventTemplateDetails = null;
  let activityTemplateDetails = {};

 // Reactive subscription to `user` store
  let currentPractitionerRoleId = null;
  let currentOrgId = null;
  let practitionerId = null;
  let isLoading = true;
  let currentOrgName = null;


  let unsubscribeUser;

    // Function to set practitioner data once it is available
    function setPractitionerData(value) {
    if (value && value.practitioner) {
      practitionerId = value.practitioner.Pid;
      currentPractitionerRoleId = value.practitioner.PRid;
      currentOrgId = value.practitioner.organizationId;
      currentOrgName = value.practitioner.organizationName;

      isLoading = false;
      console.log('Practitioner data loaded:', value.practitioner);
    } else {
      console.warn('User or practitioner data is not available.');
    }
  }



  // Helper function to get trigger details
  function getTriggerEvent(template) {
    const triggerAction = template.action?.[0];
    return triggerAction?.trigger?.[0] || null;
  }

  // Helper function to get activity definitions
  function getActivityDefinitions(template) {
    return template.action
      ?.slice(1)
      ?.filter(action => action.definitionCanonical) || [];
  }

  // Create initial plan instance structure based on template
  let planInstance = {
    name: selectedTemplate.name,
    eventInstance: {
      templateReference: getTriggerEvent(selectedTemplate)?.name,
      variables: {}
    },
    activityInstances: getActivityDefinitions(selectedTemplate).map(action => ({
      templateReference: action.definitionCanonical,
      variables: {}
    }))
  };

onMount(async () => {
    // Subscribe to `user` store to retrieve practitioner data
    const unsubscribeUser = user.subscribe(setPractitionerData);

    // Load event and activity template details after user data is available
    if (!isLoading) {
      try {
        // Load event template details if available
        if (planInstance.eventInstance.templateReference) {
          eventTemplateDetails = await getEventTemplate(planInstance.eventInstance.templateReference);
        }

        // Load activity template details for each activity
        for (const activity of planInstance.activityInstances) {
          if (activity.templateReference) {
            const templateId = activity.templateReference.split('/').pop();
            const activityTemplate = await getActivityTemplate(templateId);
            activityTemplateDetails[activity.templateReference] = activityTemplate.data;
          }
        }
      } catch (error) {
        console.error('Error loading template details:', error);
        errorMessage = 'Failed to load event or activity template details';
      }
    }

    // Cleanup subscription on component unmount
    return () => {
      unsubscribeUser();
    };
  });

  function createInstanceData() {
    return {
      resourceType: "PlanDefinition",
      status: "active",
      name: planInstance.name,
      title: selectedTemplate.title,
      usage: "cori-plan-instance",
      description: selectedTemplate.description,
      author: [{
        name: `PractitionerRole/${currentPractitionerRoleId}`
      }],
   //   date: new Date().toISOString(),
      action: [
        {
          trigger: [{
            type: "named-event",
            name: planInstance.eventInstance.templateReference
          }]
        },
        ...planInstance.activityInstances.map(activity => ({
          definitionCanonical: activity.templateReference
        }))
      ]
    };
  }

  function updatePreview() {
    previewData = createInstanceData();
  }

  function togglePreview() {
    showPreview = !showPreview;
    if (showPreview && !previewData) {
      updatePreview();
    }
  }


  async function approvePlanInstance() {
    try {
      loading = true;
      errorMessage = null;
      const instanceData = createInstanceData();
      await createPlanInstance(instanceData);
      goto('/coriplans');
    } catch (error) {
      console.error('Error creating plan instance:', error);
      errorMessage = error.message || 'Failed to create plan instance';
    } finally {
      loading = false;
    }
  }
</script>

<div class="container">
  <h2>Approve Plan Instance</h2>

  <div class="preview-controls">
    <button 
      type="button" 
      class="preview-button" 
      on:click={togglePreview}
    >
      {showPreview ? 'Hide' : 'Show'} Preview
    </button>
    
    {#if showPreview}
      <button 
        type="button" 
        class="update-preview-button" 
        on:click={updatePreview}
      >
        Update Preview
      </button>
    {/if}
  </div>

  {#if showPreview && previewData}
    <div class="preview-container">
      <h3>Instance Preview</h3>
      <pre class="preview-content">{JSON.stringify(previewData, null, 2)}</pre>
    </div>
  {/if}

  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {/if}

  <div class="plan-details">
    <div class="section">
      <h3>Plan Details</h3>
      <div class="info-group">
        <label>Title:</label>
        <div>{selectedTemplate.title}</div>
      </div>
      <div class="info-group">
        <label>Internal Name:</label>
        <div>{selectedTemplate.name}</div>
      </div>
      <div class="info-group">
        <label>Description:</label>
        <div>{selectedTemplate.description || 'No description provided'}</div>
      </div>
    </div>

    <div class="section">
      <h3>Trigger Event</h3>
      {#if getTriggerEvent(selectedTemplate)}
        <div class="info-group">
          <label>Event ID:</label>
          <div>{getTriggerEvent(selectedTemplate).name}</div>
        </div>
        <div class="info-group">
          <label>Type:</label>
          <div>{getTriggerEvent(selectedTemplate).type}</div>
        </div>
        
        {#if eventTemplateDetails}
          <div class="event-template-details">
            <h4>Event Template Configuration</h4>
            {#if eventTemplateDetails.extension?.[0]?.extension}
              {#each eventTemplateDetails.extension[0].extension as ext}
                <div class="info-group">
                  <label>{ext.url}:</label>
                  <div>{ext.valueString}</div>
                </div>
              {/each}
            {:else}
              <div class="no-data">No extension details available</div>
            {/if}
          </div>
        {:else if errorMessage}
          <div class="error-message">Failed to load event template details</div>
        {:else}
          <div class="loading-indicator">Loading event template details...</div>
        {/if}
      {:else}
        <div class="no-data">No trigger event configured</div>
      {/if}
    </div>

    <div class="section">
      <h3>Activities</h3>
      {#each getActivityDefinitions(selectedTemplate) as activity}
        <div class="activity-item">
          <div class="info-group">
            <label>Activity Reference:</label>
            <div>{activity.definitionCanonical}</div>
          </div>
    
          {#if activityTemplateDetails[activity.definitionCanonical]}
            <div class="info-group">
              <label>Name:</label>
              <div>{activityTemplateDetails[activity.definitionCanonical].name}</div>
            </div>
    
            {#if activityTemplateDetails[activity.definitionCanonical].dynamicValue}
              {#each activityTemplateDetails[activity.definitionCanonical].dynamicValue as dynamicValue}
                <div class="info-group">
                  <label>{dynamicValue.path}:</label>
                  <div>{dynamicValue.expression.expression}</div>
                </div>
              {/each}
            {:else}
              <div class="no-data">No dynamic values available</div>
            {/if}
          {:else}
            <div class="loading-indicator">Loading activity details...</div>
          {/if}
        </div>
      {/each}
    </div>
    

    <div class="actions">
      <button 
        class="approve-button" 
        on:click={approvePlanInstance} 
        disabled={loading}
      >
        {loading ? 'Creating Instance...' : 'Approve and Create Instance'}
      </button>
    </div>
  </div>
</div>

<style>

  
.event-template-details {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px dashed #e2e8f0;
  }

  .event-template-details h4 {
    color: #2d3748;
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  .loading-indicator {
    color: #6b7280;
    font-style: italic;
    padding: 0.5rem 0;
  }

  .info-group {
    margin-bottom: 0.75rem;
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
    align-items: baseline;
  }

  .info-group:last-child {
    margin-bottom: 0;
  }


  .container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  h2 {
    margin-bottom: 2rem;
    color: #2c3e50;
  }

  .plan-details {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .section {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .section h3 {
    color: #2d3748;
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  .info-group {
    margin-bottom: 0.75rem;
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
    align-items: baseline;
  }

  .info-group label {
    color: #4a5568;
    font-weight: 500;
  }

  .activity-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .activity-item {
    padding: 1rem;
    background-color: #f8fafc;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .activity-item:last-child {
    margin-bottom: 0;
  }

  .no-data {
    color: #6b7280;
    font-style: italic;
  }

  .actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
  }

  .approve-button {
    background-color: #4ade80;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .approve-button:hover {
    background-color: #22c55e;
  }

  .approve-button:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
  }

  .error-message {
    background-color: #fee2e2;
    color: #dc2626;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .preview-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    justify-content: flex-end;
  }

  .preview-button,
  .update-preview-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .preview-button {
    background-color: #3b82f6;
    color: white;
  }

  .preview-button:hover {
    background-color: #2563eb;
  }

  .update-preview-button {
    background-color: #10b981;
    color: white;
  }

  .update-preview-button:hover {
    background-color: #059669;
  }

  .preview-container {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .preview-container h3 {
    margin: 0 0 1rem 0;
    color: #2d3748;
  }

  .preview-content {
    background: white;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
    border: 1px solid #e2e8f0;
  }




</style>