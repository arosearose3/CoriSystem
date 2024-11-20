<script>
    import { onMount } from 'svelte';
  
    export let onSelectRole;
    export let localOrgArray = [];
    export let practitionerRoles = [];
  
    onMount(() => {
      console.log('RoleSelection component mounted');
      console.log('Initial localOrgArray:', localOrgArray);
      console.log('Initial practitionerRoles:', practitionerRoles);
    });
  
    $: {
      console.log('localOrgArray changed:', localOrgArray);
      console.log('practitionerRoles changed:', practitionerRoles);
    }
  
    function handleSelectRole(orgId, orgName) {
      console.log('Handling role selection for:', orgId, orgName);
      const selectedRole = practitionerRoles.find(role => role.organization?.reference === orgId);
      if (selectedRole) {
        console.log('Selected role:', selectedRole);
        onSelectRole(selectedRole, orgName);
      } else {
        console.error('No matching role found for organization:', orgId);
      }
    }
  </script>
  
  <div class="role-selection">
    <h5>Select Your Organization</h5>
    {#if localOrgArray.length === 0}
      <p>No organizations available. Please contact your administrator.</p>
    {:else}
      {#each localOrgArray as org}
        {#if org && org.id && org.name}
          <button on:click={() => handleSelectRole(org.id, org.name)}>
            {org.name}
          </button>
        {:else}
          <p>Invalid organization data</p>
        {/if}
      {/each}
    {/if}

  </div>
  
  <style>
    .role-selection {
      margin: 20px 0;
    }
    h2 {
      margin-bottom: 10px;
    }
    button {
      margin: 5px;
      padding: 10px;
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #e0e0e0;
    }
  </style>
  