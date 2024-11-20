<script>
    import { goto } from '$app/navigation';
    import { user, actions } from '$lib/stores.js';
    import { evaluate } from 'fhirpath';
    import { 
      getEventTemplates, 
      createPlanInstance, 
      updatePlanInstance,
      validatePlanDefinition 
    } from '$lib/planTemplatesUtils.js';
    import { onMount } from 'svelte';

  
    let loading = false;
    let error = null;

    let eventTemplates = [];
    let activityTemplates = [];
    let planInstance = {
      name: '',
      status: 'active',
      eventInstance: {
        templateReference: null,
        organizationId: null,
        variables: {}
      },
      activityInstances: []
    };
  
    $: {
      const { practitioner } = $user;
      if (practitioner?.Pid) {
        eventTemplates = getEventTemplates();
        activityTemplates = getActivityTemplates();
      }
    }
  
    async function loadTemplates() {
      try {
        loading = true;
        eventTemplates = await getEventTemplates();
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }

    function addActivityInstance() {
      planInstance.activityInstances.push({
        templateReference: null,
        variables: {}
      });
    }
  
    async function saveEventInstance() {
      const { practitioner, user } = $user;
      planInstance.eventInstance.organizationId = practitioner.organizationId;
      const eventTemplate = eventTemplates.find(t => t.id === planInstance.eventInstance.templateReference);
  
      // Evaluate FHIRPath expressions for event instance variables
      for (const [key, expression] of Object.entries(eventTemplate.dynamicValue)) {
        planInstance.eventInstance.variables[key] = evaluate(expression.expression, { Patient: user.user, Practitioner: practitioner })[0];
      }
  
      await createEventInstance(planInstance.eventInstance);
    }
  
    async function savePlanInstance() {
  try {
    loading = true;
    
    // Validate first
    await validatePlanDefinition(planInstance);
    
    if (planInstance.id) {
      await updatePlanInstance(planInstance.id, planInstance);
    } else {
      await createPlanInstance(planInstance);
    }
    
    goto('/plans');
  } catch (err) {
    error = err.message;
  } finally {
    loading = false;
  }
}

onMount(loadTemplates);
  
    function cancelPlanInstance() {
      goto('/plans');
    }
  </script>
  
  <div>
    <h2>Add/Edit Plan Instance</h2>
    <form on:submit|preventDefault={savePlanInstance}>
      <label>
        Name:
        <input type="text" bind:value={planInstance.name} />
      </label>
      <label>
        Event Template:
        <select bind:value={planInstance.eventInstance.templateReference}>
          <option value="">Select an event template</option>
          {#each eventTemplates as template}
            <option value={template.id}>{template.name}</option>
          {/each}
        </select>
      </label>
      {#if planInstance.eventInstance.templateReference}
        <!-- Display input fields for event instance variables -->
        {#each Object.entries(eventTemplates.find(t => t.id === planInstance.eventInstance.templateReference)?.dynamicValue || {}) as [key, expression]}
          <label>
            {key}:
            <input type="text" bind:value={planInstance.eventInstance.variables[key]} />
          </label>
        {/each}
      {/if}
      {#each planInstance.activityInstances as activityInstance, index}
        <div>
          <h3>Activity {index + 1}</h3>
          <label>
            Activity Template:
            <select bind:value={activityInstance.templateReference}>
              <option value="">Select an activity template</option>
              {#each activityTemplates as template}
                <option value={template.id}>{template.name}</option>
              {/each}
            </select>
          </label>
          <!-- Display input fields for activity instance variables -->
          {#each Object.entries(activityTemplates.find(t => t.id === activityInstance.templateReference)?.dynamicValue || {}) as [key, expression]}
            <label>
              {key}:
              <input type="text" bind:value={activityInstance.variables[key]} />
            </label>
          {/each}
        </div>
      {/each}
      <button type="button" on:click={addActivityInstance}>Add Activity</button>
      <button type="submit">Save</button>
      <button type="button" on:click={cancelPlanInstance}>Cancel</button>
    </form>
  </div>