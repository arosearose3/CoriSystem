<script>
  import { onMount } from 'svelte';
  export let currentPatientId;
  let conditions = [];
  let loading = true;
  let errorMessage = null;

  // Fetch all goals for the current patient
  async function fetchConditions() {
    try {
      const response = await fetch(`/avail/api/condition/${currentPatientId}`);
      if (!response.ok) {
        throw new Error(`Error fetching conditions: ${response.statusText}`);
      }
      const data = await response.json();
      goals = data.length ? data : [];
    } catch (error) {
      errorMessage = error.message;
    } finally {
      loading = false;
    }
  }

  // Call fetch when the component is mounted
  onMount(() => {
    fetchConditions();
  });
</script>

<!-- Render the component -->
<div class="conditions-list">
  {#if loading}
    <p>Loading conditions...</p>
  {:else if errorMessage}
    <p class="error">{errorMessage}</p>
  {:else if conditions.length === 0}
    <p>No conditions found for this patient.</p>
  {:else}
    <h4>Conditions</h4>
    <ul>
      {#each conditions as condition}
        <li>
          <strong>{condition.description.text || "Unknown condition"}</strong> - {condition.achievementStatus?.text || "Unknown Status"}
          {condition.statusDate ? ` (Status Date: ${condition.statusDate})` : ''}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .conditions-list {
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
