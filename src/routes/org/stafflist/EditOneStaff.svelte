<script>
    import { createEventDispatcher } from 'svelte';
    import UpdateSchedule from '../../capacity/UpdateSchedule.svelte';
    import { base } from '$app/paths';
    import { user} from '$lib/stores.js';
  
    export let practitioner;
    export let practitionerRoleId; // We need this for updating roles
  
    const dispatch = createEventDispatcher();
  
    let firstName = practitioner.name.split(' ')[0];
    let lastName = practitioner.name.split(' ').slice(1).join(' ');
    let dob = practitioner.birthDate;
    let npi = practitioner.npi;
    let phone = practitioner.sms;
    let email = practitioner.email;
    let errorMessage = '';
    let successMessage = '';
    let loading = false;

    let showUpdateSchedule = false;
  
    let roles = [
      { code: 'referrer', label: 'Referrer', description: 'Individuals or organizations that initiate a referral.', selected: false },
      { code: 'coordinator', label: 'Coordinator', description: 'Intermediaries that receive referrals and make referrals.', selected: false },
      { code: 'provider', label: 'Provider', description: 'A health-related provider.', selected: false },
      { code: 'orgadmin', label: 'Org Admin', description: 'An organizational administrator.', selected: false },
      { code: 'admin', label: 'Sysadmin', description: 'A Cori administrator.', selected: false }
    ];

    let currentRoleCodes = (practitioner.roles || '')
                          .split(', ')
                          .map(role => role.toLowerCase())
                          .map(role => {
                            // Map the role labels to their corresponding codes
                            switch(role) {
                              case 'referrer': return 'referrer';
                              case 'coordinator': return 'coordinator';
                              case 'provider': return 'provider';
                              case 'org admin': return 'orgadmin';
                              case 'sysadmin': return 'admin';
                              default: return role;
                            }
                          });

  
    // Set selected roles based on practitioner's current roles
    let currentRoles = practitioner.roles.split(', ');

    roles = roles.map(role => ({
      ...role,
      selected: currentRoleCodes.includes(role.code)
    }));
  
  async function handleSubmit() {
  loading = true;
  errorMessage = '';
  successMessage = '';

  try {
    // Step 1: Fetch the current practitioner data before update
    const currentPractitionerDataResponse = await fetch(`${base}/api/practitioner/${practitioner.id}`);
    const currentPractitionerData = await currentPractitionerDataResponse.json();
    
    if (!currentPractitionerDataResponse.ok) {
      throw new Error(`Failed to load current practitioner data: ${currentPractitionerData.error || 'Unknown error'}`);
    }

    // Step 2: Merge the UI form data into the existing practitioner resource
    const updatedPractitionerData = {
      ...currentPractitionerData, // Preserve all current fields
      name: [
        {
          family: lastName,
          given: [firstName],
          use: 'official'
        }
      ],
      birthDate: dob || currentPractitionerData.birthDate, // Use existing if dob is unchanged
      telecom: [
        ...currentPractitionerData.telecom?.filter(t => !['email', 'phone'].includes(t.system)) || [], // Keep other telecoms
        { system: 'email', value: email || currentPractitionerData.telecom?.find(t => t.system === 'email')?.value || '' }, // Preserve email if not changed
        { system: 'phone', value: phone || currentPractitionerData.telecom?.find(t => t.system === 'phone')?.value || '' }  // Preserve phone if not changed
      ],
      identifier: [
        ...currentPractitionerData.identifier?.filter(id => id.system !== 'http://hl7.org/fhir/sid/us-npi') || [], // Preserve other identifiers
        { system: 'http://hl7.org/fhir/sid/us-npi', value: npi || currentPractitionerData.identifier?.find(id => id.system === 'http://hl7.org/fhir/sid/us-npi')?.value || '' } // Preserve NPI if not changed
      ]
    };

    // Step 3: Update Practitioner resource
    const updatePractitionerResponse = await fetch(`${base}/api/practitioner/update/${practitioner.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedPractitionerData)
    });

    if (!updatePractitionerResponse.ok) {
      const result = await updatePractitionerResponse.json();
      throw new Error(`Failed to update practitioner: ${result.error || 'Unknown error'}`);
    }

    // Step 4: Update PractitionerRole (patch roles)
    const selectedRoles = roles.filter(role => role.selected).map(role => role.code);
    
    if (selectedRoles.length === 0) {
      throw new Error('Please select at least one role.');
    }

    const organizationId = $user.practitioner.organizationId;
    
    const updatedPractitionerRoleData = {
      practitioner: { reference: `Practitioner/${practitioner.id}` },
      organization: { reference: `Organization/${organizationId}` },
      roles: selectedRoles
    };

    const updateRoleResponse = await fetch(`${base}/api/role/patchRoles`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updatedPractitionerRoleData,
        id: practitionerRoleId // Include the PractitionerRole ID for updating
      })
    });

    if (!updateRoleResponse.ok) {
      const result = await updateRoleResponse.json();
      throw new Error(`Failed to update practitioner roles: ${result.error || 'Unknown error'}`);
    }

    successMessage = 'Practitioner and roles updated successfully.';
    dispatch('close', { success: true }); // Add success flag
  } catch (error) {
    console.error('Error updating practitioner:', error);
    errorMessage = error.message || 'An error occurred. Please try again.';
  } finally {
    loading = false;
  }
}

function handleEditCapacity () {
  showUpdateSchedule = true;
}

    function handleClose() {
      dispatch('close', { success: false }); 
    }

function handleDataLoaded() {}
function handleCapacityUpdate() {}
function handleAvailabilityUpdate() {}
function handleUpdateComplete() {showUpdateSchedule = false;}
function handleError() {}
function handleCapacityChange() {}
function handleAvailabilityChange() {}
</script>

{#if showUpdateSchedule && practitionerRoleId !== null}
 
  <UpdateSchedule
  currentPractitionerRoleId={practitionerRoleId}
  on:dataLoaded={handleDataLoaded}
  on:capacityUpdate={handleCapacityUpdate}
  on:availabilityUpdate={handleAvailabilityUpdate}
  on:updateComplete={handleUpdateComplete}
  on:updateError={handleError}
  on:capacityChange={handleCapacityChange}
  on:availabilityChange={handleAvailabilityChange}
/>
{:else}
  
<div class="edit-staff-container">
    <h2>Edit Practitioner</h2>
    <button type="button" on:click={handleEditCapacity}>Edit Capacity and Availability</button>
  <br>
    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
    {/if}
  
    {#if successMessage}
      <div class="success-message">{successMessage}</div>
    {/if}
  
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="firstName">First Name:</label>
        <input id="firstName" type="text" bind:value={firstName} required>
      </div>
  
      <div class="form-group">
        <label for="lastName">Last Name:</label>
        <input id="lastName" type="text" bind:value={lastName} required>
      </div>
  
      <div class="form-group">
        <label for="dob">Date of Birth:</label>
        <input id="dob" type="date" bind:value={dob}>
      </div>
  
      <div class="form-group">
        <label for="npi">NPI:</label>
        <input id="npi" type="text" bind:value={npi}>
      </div>
  
      <div class="form-group">
        <label for="phone">Text Phone:</label>
        <input id="phone" type="tel" bind:value={phone}>
      </div>
  
      <div class="form-group">
        <label for="email">Email:</label>
        <input id="email" type="email" bind:value={email} readonly class="readonly-field">
      </div>
  
      <!-- Role Selection -->
      <h3>Select Roles</h3>
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
              <td><input type="checkbox" bind:checked={role.selected} /></td>
              <td>{role.label}</td>
              <td>{role.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
  
      <button type="submit" disabled={loading}>
        {#if loading}Updating...{/if}
        {#if !loading}Update{/if}
      </button>
      <button type="button" on:click={handleClose}>Cancel</button>
    </form>
  </div>
{/if}

<style>
      .readonly-field {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
    .edit-staff-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  
    .form-group {
      margin-bottom: 20px;
    }
  
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
  
    input {
      width: 100%;
      padding: 10px;
      font-size: 1rem;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
  
    button {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1rem;
      margin-right: 10px;
    }
  
    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  
    .error-message {
      color: red;
      margin-bottom: 20px;
    }
  
    .success-message {
      color: green;
      margin-bottom: 20px;
    }
  
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
  
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
  
    th {
      background-color: #f2f2f2;
    }
  </style>