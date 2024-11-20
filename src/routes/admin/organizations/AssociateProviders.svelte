<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

  let practitioners = [];
  let organizations = [];
  let practitionerRoles = [];
  let selectedPractitioner = null;
  let availableOrganizations = [];
  let selectedOrganizationId = null;
  let message = '';

  onMount(async () => {
    await fetchPractitioners();
    await fetchOrganizations();
  });

  async function fetchPractitioners() {
  try {
    const response = await fetch(`${base}/api/practitioner/all`);
    const data = await response.json();

    // Check if data is an array of entries with resource property
    if (Array.isArray(data)) {
      practitioners = data
        .filter(entry => entry.resource?.resourceType === 'Practitioner')
        .map(entry => {
          const practitioner = entry.resource;
          const name = practitioner.name?.[0];
          let displayName = '';

          if (name?.text) {
            displayName = name.text;
          } else if (name?.given || name?.family) {
            displayName = [
              ...(name.given || []),
              name.family
            ].filter(Boolean).join(' ');
          }

          return {
            id: practitioner.id,
            resourceType: 'Practitioner',
            displayName: displayName || 'Unnamed Practitioner',
            active: practitioner.active,
            email: practitioner.telecom?.find(t => t.system === 'email')?.value
          };
        })
        .filter(p => p.active !== false) // Only include active practitioners
        .sort((a, b) => a.displayName.localeCompare(b.displayName)); // Sort by name
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching practitioners:', error);
    message = `Error fetching practitioners: ${error.message}`;
    practitioners = [];
  }
}

  async function fetchOrganizations() {
    try {
      const response = await fetch(`${base}/api/organization/all`);
      const data = await response.json();

      if (Array.isArray(data)) {
        organizations = data
          .filter(org => org.active !== false) // Only include active organizations
          .map(org => ({
            id: org.id,
            name: org.name || 'Unnamed Organization',
            city: org.address?.[0]?.city || '',
            state: org.address?.[0]?.state || ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
      } else {
        throw new Error('Invalid Organization data format');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      message = `Error fetching organizations: ${error.message}`;
      organizations = [];
    }
  }

  async function fetchPractitionerRoles(practitionerId) {
    try {
      const response = await fetch(`${base}/api/role/PractitionerRole?practitioner=Practitioner/${practitionerId}`);
      const data = await response.json();

      if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
        practitionerRoles = data.entry
          .filter(entry => entry.resource && entry.resource.resourceType === 'PractitionerRole')
          .map(entry => {
            const role = entry.resource;
            const orgReference = role.organization?.reference?.split('/')[1];
            const organization = organizations.find(org => org.id === orgReference);
            
            return {
              id: role.id,
              practitionerId: practitionerId,
              practitionerName: selectedPractitioner.displayName,
              organization: {
                id: orgReference || '',
                name: organization?.name || role.organization?.display || 'Unknown Organization'
              }
            };
          });

        updateAvailableOrganizations();
      } else {
        practitionerRoles = [];
        message = 'No associated organizations found for this practitioner.';
      }
    } catch (error) {
      console.error('Error fetching PractitionerRoles:', error);
      message = `Error fetching practitioner roles: ${error.message}`;
      practitionerRoles = [];
    }
  }

  function updateAvailableOrganizations() {
    const associatedOrganizationIds = new Set(practitionerRoles.map(role => role.organization.id));
    availableOrganizations = organizations
      .filter(org => !associatedOrganizationIds.has(org.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function handlePractitionerChange() {
    if (selectedPractitioner) {
      fetchPractitionerRoles(selectedPractitioner.id);
      selectedOrganizationId = null; // Reset organization selection
    } else {
      practitionerRoles = [];
      availableOrganizations = [];
    }
  }

  async function addAssociation(organizationId) {
    if (!selectedPractitioner || !organizationId) {
      message = 'Please select both a Practitioner and an Organization.';
      return;
    }

    const organization = availableOrganizations.find(org => org.id === organizationId);
    if (!organization) {
      message = 'Selected organization not found.';
      return;
    }

    try {
      const response = await fetch(`${base}/api/role/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          practitionerId: selectedPractitioner.id,
          organizationId: organizationId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message === 'PractitionerRole created successfully') {
        message = 'Association created successfully.';
        // Refresh the practitioner roles
        await fetchPractitionerRoles(selectedPractitioner.id);
        selectedOrganizationId = null;
      } else {
        throw new Error(data.error || 'Failed to create association');
      }
    } catch (error) {
      console.error('Error adding association:', error);
      message = `Failed to create association: ${error.message}`;
    }
  }
</script>

<div class="container">
  <h2>Associate Practitioners with Organizations</h2>

  <div class="selection-container">
    <label for="practitioner-select">Practitioner:</label>
    <select 
      id="practitioner-select"
      bind:value={selectedPractitioner} 
      on:change={handlePractitionerChange}
    >
      <option value={null}>Select Practitioner</option>
      {#each practitioners as practitioner}
        <option value={practitioner}>
          {practitioner.displayName}
        </option>
      {/each}
    </select>
  </div>

  {#if practitionerRoles.length > 0}
    <div class="roles-container">
      <h3>Current Associations</h3>
      <ul class="roles-list">
        {#each practitionerRoles as role}
          <li>
            <span class="org-name">{role.organization.name}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if selectedPractitioner && availableOrganizations.length > 0}
    <div class="add-association">
      <label for="org-select">Add Organization:</label>
      <select 
        id="org-select"
        bind:value={selectedOrganizationId}
      >
        <option value={null}>Select Organization</option>
        {#each availableOrganizations as org}
          <option value={org.id}>
            {org.name} {org.city ? `(${org.city}${org.state ? `, ${org.state}` : ''})` : ''}
          </option>
        {/each}
      </select>
      <button 
        on:click={() => addAssociation(selectedOrganizationId)}
        disabled={!selectedOrganizationId}
      >
        Add Association
      </button>
    </div>
  {/if}

  {#if message}
    <div class="message" class:error={message.includes('Error') || message.includes('Failed')}>
      {message}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .selection-container {
    margin-bottom: 20px;
  }

  .roles-container {
    margin: 20px 0;
  }

  .roles-list {
    list-style: none;
    padding: 0;
  }

  .roles-list li {
    padding: 8px;
    margin: 4px 0;
    background-color: #f5f5f5;
    border-radius: 4px;
  }

  .add-association {
    display: grid;
    gap: 10px;
    margin-top: 20px;
  }

  select {
    width: 100%;
    padding: 8px;
    margin: 5px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  button {
    padding: 8px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    background-color: #45a049;
  }

  .message {
    margin-top: 15px;
    padding: 10px;
    border-radius: 4px;
    background-color: #e8f5e9;
  }

  .message.error {
    background-color: #ffebee;
    color: #c62828;
  }

  label {
    font-weight: bold;
  }
</style>