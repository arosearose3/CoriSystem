<script>
  import { onMount, createEventDispatcher } from 'svelte';

  let organizations = [];
  let selectedOrg = null;
  let showOrgList = true;
  let hoveredOrg = null;
  const dispatch = createEventDispatcher();

  onMount(async () => {
    try {
      const response = await fetch('/avail/api/organization/all');
      if (response.ok) {
        const data = await response.json();
        if (data.entry && Array.isArray(data.entry)) {
          organizations = data.entry.map(entry => entry.resource);
        } else {
          console.error('No organizations found or invalid response format');
        }
      } else {
        console.error('Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  });

  function selectOrg(org) {
    selectedOrg = org;
    showOrgList = false;
    dispatch('orgSelected', { organizationId: org.id, name: org.name });
  }

  function resetSelection() {
    selectedOrg = null;
    showOrgList = true;
  }
</script>

<div class="choose-provider">
  {#if showOrgList}
    <h2>Select Organization</h2>
    <ul>
      {#each organizations as org}
        <li>
          <label>
            <input type="radio" name="organization" on:click={() => selectOrg(org)} />
            {org.name}
            <span 
              class="info-icon" 
              on:mouseover={() => (hoveredOrg = org)} 
              on:mouseout={() => (hoveredOrg = null)}>
              ℹ️
            </span>
          </label>

          {#if hoveredOrg === org}
            <div class="org-card">
              <strong>{org.name}</strong>
              <br />
              Contact: {org.contact ? org.contact[0].name.text : 'No contact available'}
              <br />
              Phone: {org.contact && org.contact[0].telecom ? org.contact[0].telecom.find(t => t.system === 'phone')?.value || 'No phone' : 'No phone'}
              <br />
              Email: {org.contact && org.contact[0].telecom ? org.contact[0].telecom.find(t => t.system === 'email')?.value || 'No email' : 'No email'}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <div>
      <strong>{selectedOrg.name}</strong> 
      <span class="change-link" on:click={resetSelection}> (Change)</span>
    </div>
  {/if}
</div>

<style>
  .choose-provider {
    background-color: #f0f0f0;
    padding: 15px;
    border-radius: 5px;
    max-width: 400px;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 10px 0;
    position: relative;
  }

  input[type="radio"] {
    margin-right: 10px;
  }

  .info-icon {
    cursor: pointer;
    margin-left: 10px;
    color: blue;
  }

  .org-card {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    padding: 10px;
    width: 250px;
    top: 0;
    left: 150px;
    z-index: 10;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .change-link {
    cursor: pointer;
    color: blue;
    margin-left: 10px;
  }

  .change-link:hover {
    text-decoration: underline;
  }
</style>
