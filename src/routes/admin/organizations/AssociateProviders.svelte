<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths'; // Import base path

  let practitioners = [];
  let organizations = [];
  let practitionerRoles = [];
  let selectedPractitioner = null;
  let availableOrganizations = [];
  let selectedOrganizationId = null; // Declare selectedOrganizationId
  let message = '';

  // Fetch practitioners and organizations when the component is mounted
  onMount(async () => {
    await fetchPractitioners();
    await fetchOrganizations();
  });

  // Function to fetch practitioners and transform the FHIR response
  async function fetchPractitioners() {
    try {
      const response = await fetch(`${base}/api/practitioner/all`);
      const data = await response.json();

      // Check if the response is a FHIR bundle and has entries
      if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
        practitioners = data.entry.map(entry => {
          const practitioner = entry.resource;
          return {
            id: practitioner.id || '',
            displayName: `${practitioner.name[0]?.given?.join(' ') || ''} ${practitioner.name[0]?.family || ''}`,
          };
        });
      } else {
        throw new Error('Invalid Practitioner FHIR Bundle format');
      }
    } catch (error) {
      console.error('Error fetching practitioners:', error);
      message = 'Error fetching practitioners. Please try again.';
    }
  }

  // Function to fetch all organizations
  async function fetchOrganizations() {
    try {
      const response = await fetch(`${base}/api/organization/all`);
      const data = await response.json();

      // Check if the response is an array of organizations
      if (Array.isArray(data)) {
        organizations = data.map(org => ({
          id: org.id || '',
          name: org.name || 'Unnamed Organization',
        }));
      } else {
        throw new Error('Invalid Organization format');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      message = 'Error fetching organizations. Please try again.';
    }
  }

  // Fetch PractitionerRoles for the selected practitioner
  async function fetchPractitionerRoles(practitionerId) {
    try {
      const response = await fetch(`${base}/api/role/PractitionerRole?practitioner=Practitioner/${practitionerId}`);
      const data = await response.json();

      // Check if the response is a FHIR bundle and has entries
      if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
        practitionerRoles = data.entry.map(entry => {
          const role = entry.resource;
          return {
            id: role.id,
            practitionerName: selectedPractitioner.displayName,
            organization: {
              id: role.organization?.reference?.split('/')[1] || '',
              name: role.organization?.display || 'Unknown Organization',
            },
          };
        });

        // Filter out already associated organizations for the dropdown
        updateAvailableOrganizations();
      } else {
        practitionerRoles = [];
        message = 'No associated organizations found for this practitioner.';
      }
    } catch (error) {
      console.error('Error fetching PractitionerRoles:', error);
      message = 'Error fetching PractitionerRoles. Please try again.';
    }
  }

  // Update available organizations for selection
  function updateAvailableOrganizations() {
    const associatedOrganizationIds = new Set(practitionerRoles.map(role => role.organization.id));
    availableOrganizations = organizations.filter(org => !associatedOrganizationIds.has(org.id));
  }

  // Handle practitioner selection
  function handlePractitionerChange() {
    if (selectedPractitioner) {
      fetchPractitionerRoles(selectedPractitioner.id);
    } else {
      practitionerRoles = [];
      availableOrganizations = [];
    }
  }

  // Function to handle adding a new association
  async function addAssociation(organizationId) {
  if (!selectedPractitioner || !organizationId) {
    alert('Please select both a Practitioner and an Organization.');
    return;
  }

  const organization = availableOrganizations.find(org => org.id === organizationId);
  if (!organization) {
    alert('Selected organization not found.');
    return;
  }

  try {
    // Send the request to create a new PractitionerRole
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

    // Parse the response data
    const data = await response.json();

    // Check if the response was successful
    if (response.ok && data.message === 'PractitionerRole created successfully') {
      alert('PractitionerRole created successfully.');
      // Add the new role to the practitionerRoles array using the returned data
      practitionerRoles = [...practitionerRoles, data.data];
      updateAvailableOrganizations();
    } else {
      // Show an error message if the creation failed
      alert(`Error creating PractitionerRole: ${data.error || 'Unknown error occurred.'}`);
    }
  } catch (error) {
    console.error('Error adding association:', error);
    alert(`Failed to create PractitionerRole: ${error.message}`);
  }
}

</script>

<div class="container">
  <h2>Associate Practitioners with Organizations</h2>

  <!-- Practitioner selection -->
  <label>Practitioner:</label>
  <select bind:value={selectedPractitioner} on:change={handlePractitionerChange}>
    <option value="">Select Practitioner</option>
    {#each practitioners as practitioner}
      <option value={practitioner}>{practitioner.displayName}</option>
    {/each}
  </select>

  <!-- Display Practitioner-Organization pairs -->
  {#if practitionerRoles.length > 0}
    <h3>Associated Organizations</h3>
    <ul>
      {#each practitionerRoles as role}
        <li>{role.practitionerName} - {role.organization.name}</li>
      {/each}
    </ul>
  {/if}

  <!-- Organization selection and add association -->
  {#if selectedPractitioner && availableOrganizations.length > 0}
    <div class="add-association">
      <label>Associate with Organization:</label>
      <select bind:value={selectedOrganizationId}>
        <option value="">Select Organization</option>
        {#each availableOrganizations as org}
          <option value={org.id}>{org.name}</option>
        {/each}
      </select>
      <button on:click={() => addAssociation(selectedOrganizationId)}>Add Association</button>
    </div>
  {/if}

  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  .add-association {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  select {
    flex-grow: 1;
    margin-bottom: 10px;
  }

  button {
    padding: 5px 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }

  button:hover {
    background-color: #45a049;
  }

  .message {
    margin-top: 15px;
    padding: 10px;
    background-color: #f0f0f0;
    border-radius: 4px;
  }
</style>