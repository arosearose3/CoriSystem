<script>
  import { onMount } from 'svelte';
  
  let conditions = [];
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      // Stub API call
      const response = await fetch('/api/workflow/conditions');
      conditions = await response.json();
    } catch (e) {
      error = e.message;
      // Stub data for development
      conditions = [
        { id: 1, name: 'Age Over 65', expression: 'Patient.age > 65' },
        { id: 2, name: 'Has Diabetes', expression: 'Condition.code = 73211009' },
        { id: 3, name: 'Recent Lab Result', expression: 'Observation.date > today()-7' }
      ];
    } finally {
      loading = false;
    }
  });
</script>

<div class="container">
  <h2>Conditions</h2>
  
  {#if loading}
    <p>Loading conditions...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Expression</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each conditions as condition}
          <tr>
            <td>{condition.name}</td>
            <td><code>{condition.expression}</code></td>
            <td>
              <button on:click={() => alert(`Edit condition ${condition.id}`)}>Edit</button>
              <button on:click={() => alert(`Delete condition ${condition.id}`)}>Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    
    <button class="add-button">Add New Condition</button>
  {/if}
</div>

<style>
  .container {
    padding: 1rem;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  
  th, td {
    padding: 0.5rem;
    text-align: left;
    border: 1px solid #ddd;
  }
  
  code {
    background-color: #f5f5f5;
    padding: 0.2rem;
    border-radius: 3px;
  }
  
  .error {
    color: red;
  }
  
  .add-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
