<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths'; // Import base path

   let organizations = [];

  let practitioners = [];
  let selectedPractitioner = null;
  let selectedOrganization = null;
  let roles = [
    { code: 'referrer', label: 'Referrer', description: 'Individuals or organizations that initiate a referral, connecting clients with services or providers.', selected: false },
    { code: 'coordinator', label: 'Coordinator', description: 'Intermediaries that receive referrals and make referrals.', selected: false },
    { code: 'provider', label: 'Provider', description: 'A health-related social needs provider or healthcare provider who receives referrals and delivers services to clients.', selected: false },
    { code: 'orgadmin', label: 'Org Admin', description: 'An organizational administrator responsible for managing users, permissions, and settings within their organization in Cori.', selected: false },
    { code: 'admin', label: 'Admin', description: 'System administrator with broad access and control over the Cori system, responsible for overall maintenance and security.', selected: false },
    { code: 'client', label: 'Client', description: 'The individual receiving services through a referral, typically the patient or beneficiary.', selected: false },
    { code: 'publichealth', label: 'Public Health', description: 'Public health professionals engaged in tracking and improving community health outcomes through data and service coordination.', selected: false }
  ];
  let message = '';

  // Log organizations on mount
  onMount(() => {
    console.log('Received organizations in SetUserRoles:', organizations);
    fetchPractitioners();
    fetchOrganizations();
  });

  async function fetchOrganizations() {
    try {
      const response = await fetch(`${base}/api/organization/all`);
      const data = await response.json();

      // Check if the response is an array of organizations
      if (Array.isArray(data)) {
        organizations = data.map(organization => ({
          id: organization.id || '',
          name: organization.name || 'Unnamed Organization',
        }));
      } else {
        throw new Error('Invalid Organization format');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      message = 'Error fetching organizations. Please try again.';
    }
  }

  // Fetch practitioners function
  async function fetchPractitioners() {
    try {
      const response = await fetch(`${base}/api/practitioner/all`);
      const data = await response.json();

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

  // Handle form submission
  async function handleSubmit() {
    if (!selectedPractitioner || !selectedOrganization) {
      alert('Please select a Practitioner and an Organization.');
      return;
    }

    const selectedRoles = roles.filter(role => role.selected).map(role => role.code);

    if (selectedRoles.length === 0) {
      alert('Please select at least one role.');
      return;
    }

    try {
      const body = {
        practitioner: { reference: `Practitioner/${selectedPractitioner.id}` },
        organization: { reference: `Organization/${selectedOrganization.id}` },
        roles: selectedRoles,
      };

      const response = await fetch(`${base}/api/role/patchRoles`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        message = 'Roles updated successfully!';
        resetForm();
      } else {
        message = `Error: ${result.error || 'Unknown error occurred'}`;
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      message = `Error: ${error.message || 'Unknown error occurred'}`;
    }
  }

  // Reset form
  function resetForm() {
    selectedPractitioner = null;
    selectedOrganization = null;
    roles.forEach(role => (role.selected = false));
  }
</script>

<div class="container">
  <h2>Set Practitioner Role in Organization</h2>

  <!-- Practitioner and Organization Selection -->
  <div class="selection">
    <label>Practitioner:</label>
    <select bind:value={selectedPractitioner}>
      <option value="">Select Practitioner</option>
      {#each practitioners as practitioner}
        <option value={practitioner}>{practitioner.displayName}</option>
      {/each}
    </select>

    <label>Organization:</label>
    <select bind:value={selectedOrganization}>
      <option value="">Select Organization</option>
      {#each organizations as organization}
        <option value={organization}>{organization.name}</option>
      {/each}
    </select>
  </div>

  <!-- Display selected Practitioner and Organization -->
  {#if selectedPractitioner && selectedOrganization}
    <p>Selected Practitioner: {selectedPractitioner.displayName}</p>
    <p>Selected Organization: {selectedOrganization.name}</p>
  {/if}

  <!-- Roles Selection Table -->
  <table>
    <thead>
      <tr>
        <th>Select</th>
        <th>Role</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {#each roles as role}
        <tr>
          <td>
            <input type="checkbox" bind:checked={role.selected} />
          </td>
          <td>{role.label}</td>
          <td style="width: 60%;">{role.description}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- Submit and Cancel Buttons -->
  <div class="actions">
    <button on:click={handleSubmit}>Submit</button>
    <button on:click={resetForm}>Cancel</button>
  </div>

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

  .selection {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  select {
    flex-grow: 1;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }

  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }

  th {
    background-color: #f2f2f2;
  }

  .actions {
    margin-top: 20px;
  }

  button {
    margin-right: 10px;
    padding: 10px 20px;
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