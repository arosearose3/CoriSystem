<script>
  import { onMount } from 'svelte';
  export let currentPatientId;
  let goals = [];
  let loading = true;
  let errorMessage = null;

  // Fetch all goals for the current patient
  async function fetchGoals() {
    try {
      const response = await fetch(`/avail/api/goal/${currentPatientId}`);
      if (!response.ok) {
        throw new Error(`Error fetching goals: ${response.statusText}`);
      }
      const data = await response.json();
      goals = data.length ? data : [];
    } catch (error) {
      errorMessage = error.message;
    } finally {
      loading = false;
    }
  }

  // Call fetchGoals when the component is mounted
  onMount(() => {
    fetchGoals();
  });
</script>

<!-- Render the component -->
<div class="goals-list">
  {#if loading}
    <p>Loading goals...</p>
  {:else if errorMessage}
    <p class="error">{errorMessage}</p>
  {:else if goals.length === 0}
    <p>No goals found for this patient.</p>
  {:else}
    <h3>Goals for Patient</h3>
    <ul>
      {#each goals as goal}
        <li>
          <strong>{goal.description.text || "Unknown Goal"}</strong> - {goal.achievementStatus?.text || "Unknown Status"}
          {goal.statusDate ? ` (Status Date: ${goal.statusDate})` : ''}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .goals-list {
    padding: 20px;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    padding: 10px;
    border-bottom: 1px solid #ccc;
  }

  .error {
    color: red;
  }
</style>
