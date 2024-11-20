<script>
    import { createEventDispatcher } from 'svelte';
    import UpdateSchedule from '../../capacity/UpdateSchedule.svelte';
    import { base } from '$app/paths';
    import { user} from '$lib/stores.js';
  
    export let practitioner;
    export let practitionerRoleId; // We need this for updating roles
  
    const dispatch = createEventDispatcher();
  
    let firstName = practitioner.firstName;
    let lastName = practitioner.lastName;
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
  
// Helper function to check if a value should be removed
function shouldRemoveValue(value) {
  if (value === null || value === undefined || value === '' || value === 'Unknown') {
    return true;
  }
  return false;
}

// Helper function to clean objects for FHIR compatibility
function cleanObject(obj) {
  // If not an object or is null, return as is
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanObject(item))
      .filter(item => {
        if (typeof item === 'object') {
          return Object.keys(item).length > 0;
        }
        return !shouldRemoveValue(item);
      });
  }

  // Clone the object to avoid modifying the original
  const cleaned = { ...obj };

  for (const key in cleaned) {
    // Skip resourceType, id, meta, and extension fields
    if (['resourceType', 'id', 'meta', 'extension'].includes(key)) {
      continue;
    }

    // Handle nested objects including telecom and identifier arrays
    if (typeof cleaned[key] === 'object') {
      cleaned[key] = cleanObject(cleaned[key]);
      
      // Remove empty objects
      if (Array.isArray(cleaned[key])) {
        if (cleaned[key].length === 0) {
          delete cleaned[key];
        }
      } else if (!cleaned[key] || Object.keys(cleaned[key]).length === 0) {
        delete cleaned[key];
      }
    } else {
      // Handle primitive values
      if (shouldRemoveValue(cleaned[key])) {
        delete cleaned[key];
      }
    }
  }

  return cleaned;
}

// Function to build the name structure
function buildNameStructure(firstName, lastName) {
  const name = {
    use: 'official'
  };

  if (!shouldRemoveValue(lastName)) {
    name.family = lastName;
  }

  if (!shouldRemoveValue(firstName)) {
    name.given = [firstName];
  }

  return [name];
}

// Function to build telecom array
function buildTelecomArray(email, phone, currentTelecom = []) {
  const telecom = [];
  
  if (!shouldRemoveValue(email)) {
    telecom.push({ system: 'email', value: email });
  }
  
  if (!shouldRemoveValue(phone)) {
    telecom.push({ system: 'phone', value: phone });
  }
  
  // Preserve other existing telecom entries that don't have 'Unknown' values
  if (Array.isArray(currentTelecom)) {
    currentTelecom
      .filter(t => 
        !['email', 'phone'].includes(t.system) && 
        !shouldRemoveValue(t.value)
      )
      .forEach(t => telecom.push(t));
  }
  
  return telecom;
}

// Function to build identifier array
function buildIdentifierArray(npi, currentIdentifiers = []) {
  const identifiers = [];
  
  if (!shouldRemoveValue(npi)) {
    identifiers.push({
      system: 'http://hl7.org/fhir/sid/us-npi',
      value: npi
    });
  }
  
  // Preserve other existing identifiers that don't have 'Unknown' values
  if (Array.isArray(currentIdentifiers)) {
    currentIdentifiers
      .filter(id => 
        id.system !== 'http://hl7.org/fhir/sid/us-npi' && 
        !shouldRemoveValue(id.value)
      )
      .forEach(id => identifiers.push(id));
  }
  
  return identifiers;
}

// Function to fetch current practitioner data
async function fetchCurrentPractitioner(practitionerId) {
  const response = await fetch(`${base}/api/practitioner/${practitionerId}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to load current practitioner data: ${data.error || 'Unknown error'}`);
  }
  
  return data;
}

// Function to update practitioner data
async function updatePractitioner(practitionerId, updatedData) {
  console.log('Updating practitioner with data:', JSON.stringify(updatedData));
  const response = await fetch(`${base}/api/practitioner/update/${practitionerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedData)
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to update practitioner: ${result.error || 'Unknown error'}`);
  }
  
  return result;
}

// Function to update practitioner roles
async function updatePractitionerRoles(practitionerId, organizationId, selectedRoles, practitionerRoleId) {
  if (selectedRoles.length === 0) {
    throw new Error('Please select at least one role.');
  }
  
  const roleData = {
    id: practitionerRoleId,
    practitioner: { reference: `Practitioner/${practitionerId}` },
    organization: { reference: `Organization/${organizationId}` },
    roles: selectedRoles
  };
  
  const response = await fetch(`${base}/api/role/patchRoles`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(roleData)
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to update practitioner roles: ${result.error || 'Unknown error'}`);
  }
  
  return result;
}

// Main submit handler
async function handleSubmit() {
  loading = true;
  errorMessage = '';
  successMessage = '';

  try {
    // Step 1: Fetch current data
    const currentPractitionerData = await fetchCurrentPractitioner(practitioner.id);
    
    // Step 2: Build updated practitioner data
    let updatedPractitionerData = {
      ...currentPractitionerData,  // This preserves extension, meta, etc.
      name: buildNameStructure(firstName, lastName),
      telecom: buildTelecomArray(email, phone, currentPractitionerData.telecom),
      identifier: buildIdentifierArray(npi, currentPractitionerData.identifier)
    };

    // Only add birthDate if it's not "Unknown" or empty
    if (!shouldRemoveValue(dob)) {
      updatedPractitionerData.birthDate = dob;
    }
    
    // Step 3: Clean the data structure while preserving required fields
    updatedPractitionerData = cleanObject(updatedPractitionerData);
    
    // Step 4: Update practitioner
    await updatePractitioner(practitioner.id, updatedPractitionerData);
    
    // Step 5: Update roles
    const selectedRoles = roles
      .filter(role => role.selected)
      .map(role => role.code);
    
    await updatePractitionerRoles(
      practitioner.id,
      $user.practitioner.organizationId,
      selectedRoles,
      practitionerRoleId
    );
    
    successMessage = 'Practitioner and roles updated successfully.';
    dispatch('close', { success: true });
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