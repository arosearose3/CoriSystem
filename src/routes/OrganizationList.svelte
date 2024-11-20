<!-- OrganizationList.svelte -->
<script>
  export let organizations;
  export let practitionerRoles;
  export let selectPractitionerRole;
  
  import { onMount } from 'svelte';

  let isSelectingRole = false;
  let selectedOrganizationId = null;
  let generalError = null;

  async function handleSelectRole(role) {
    isSelectingRole = true;
    try {
      await selectPractitionerRole(role);
      // Optionally, add success feedback here
    } catch (error) {
      console.error(error);
      generalError = 'Failed to select role. Please try again.';
    } finally {
      isSelectingRole = false;
    }
  }
</script>

<div class="organization-list">
  <h3>Select an Organization</h3>
  <ul>
    {#each organizations as org}
      <li>
        <button 
          on:click={() => handleSelectRole(practitionerRoles.find(role => role.organization?.id === org.id))}
          disabled={isSelectingRole || !practitionerRoles.some(role => role.organization?.id === org.id)}
          aria-label={`Select role for organization ${org.name}`}
        >
          {isSelectingRole && selectedOrganizationId === org.id ? 'Selecting...' : org.name}
        </button>
      </li>
    {/each}
  </ul>
  {#if generalError}
    <div class="error-message" role="alert" aria-live="assertive">
      {generalError}
    </div>
  {/if}
</div>

<style>
  .organization-list h3 {
    margin-bottom: 10px;
    font-size: 16px;
    color: #555;
  }

  .organization-list ul {
    list-style: none;
    padding: 0;
  }

  .organization-list button {
    padding: 8px 12px;
    margin-bottom: 8px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    cursor: pointer;
    width: 100%;
    text-align: left;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .organization-list button:hover:not(:disabled) {
    background-color: #e0e0e0;
  }

  .organization-list button:disabled {
    background-color: #ddd;
    cursor: not-allowed;
  }

  .error-message {
    color: red;
    margin-top: 10px;
    font-size: 14px;
  }
</style>
