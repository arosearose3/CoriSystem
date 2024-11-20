<script>
    import { goto } from '$app/navigation';
    import { user, actions } from '$lib/stores.js';

    import { searchPlansByType ,getActivePlanInstances} from '$lib/planTemplatesUtils.js';
    let planInstances = [];
    let loading = false;
    let error = null;

  
    $: {
      const { practitioner } = $user;
      if (practitioner?.Pid) {
        planInstances = getActivePlanInstances(practitioner.Pid);
      }
    }
  
    function addNewPlan() {
      goto('/add-plan');
    }
  
    async function toggleStatus(planInstance) {
      await togglePlanInstanceStatus(planInstance);
    }

    async function loadUserPlans() {
        try {
            loading = true;
            planInstances = await searchPlansByType('cori-plan-instance');
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
     }

    onMount(loadUserPlans);

  </script>
  
  <div>
    <h2>Your Plan Instances</h2>
    {#if planInstances.length === 0}
      <p>You don't have any active plan instances yet.</p>
    {:else}
      <ul>
        {#each planInstances as instance}
          <li>
            <h3>{instance.name}</h3>
            <p>Status: {instance.status}</p>
            <button on:click={() => toggleStatus(instance)}>{instance.status === 'active' ? 'Deactivate' : 'Activate'}</button>
          </li>
        {/each}
      </ul>
    {/if}
    <button on:click={addNewPlan}>Add Plan</button>
  </div>