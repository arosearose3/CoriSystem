<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    import { user } from '$lib/stores.js'; // Assuming organizationId is stored in stores.js
    
    let firstName = '';
    let lastName = '';
    let dob = '';
    let npi = '';
    let phone = '';
    let email = '';
    let errorMessage = '';
    let successMessage = '';
    let loading = false;
    
    let organizations = [];
    let roles = [
      { code: 'referrer', label: 'Referrer', description: 'Individuals or organizations that initiate a referral.', selected: false },
      { code: 'coordinator', label: 'Coordinator', description: 'Intermediaries that receive referrals and make referrals.', selected: false },
      { code: 'provider', label: 'Provider', description: 'A health-related provider.', selected: false },
      { code: 'orgadmin', label: 'Org Admin', description: 'An organizational administrator.', selected: false }
    ]; // Filter out admin, client, publichealth roles
    
    onMount(() => {
      console.log ("in AddOneStaff");
    });
    
    async function handleSubmit() {
  loading = true;
  errorMessage = '';
  successMessage = '';

  try {
    // Step 1: Check if Practitioner exists by email
    const practitioner = await findByEmail(email);
    let practitionerId;

    if (!practitioner) {
      // If Practitioner does not exist, create a new Practitioner
      practitionerId = await createNewPractitioner();
    } else {
      practitionerId = practitioner.id;
      console.log(`Practitioner exists with ID: ${practitionerId}`);
    }

    // Step 2: Check if PractitionerRole exists for the Practitioner and Organization
    const organizationId = $user.practitioner.organizationId; // Assuming organizationId is available in the user store
    const practitionerRoleExists = await checkPractitionerRole(practitionerId, organizationId);

    if (!practitionerRoleExists) {
      // If PractitionerRole does not exist, create a new PractitionerRole
      await createNewPractitionerRole(practitionerId, organizationId);
    }

    // Step 3: Patch roles for the PractitionerRole
    await patchRoles(practitionerId, organizationId);

    successMessage = 'Staff member successfully added/updated with roles.';
    resetForm();

  } catch (error) {
    console.error('Error adding or updating staff:', error);
    errorMessage = 'An error occurred. Please try again.';
  } finally {
    loading = false;
  }
}

// Subroutine to find Practitioner by email
async function findByEmail(email) {
  const response = await fetch(`${base}/api/practitioner/findWithEmail?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const data = await response.json();
  return data.length > 0 ? data[0] : null;
}

// Subroutine to create a new Practitioner
async function createNewPractitioner() {
  const newPractitionerData = {
    resourceType: 'Practitioner',
    name: [{ family: lastName, given: [firstName], use: 'official' }],
    birthDate: dob,
    telecom: [{ system: 'email', value: email }, { system: 'phone', value: phone }],
    identifier: [{ system: 'http://hl7.org/fhir/sid/us-npi', value: npi }]
  };

  const response = await fetch(`${base}/api/practitioner/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPractitionerData),
  });

  const createdPractitioner = await response.json();
  console.log(`New Practitioner created with ID: ${createdPractitioner.practitionerID}`);
  return createdPractitioner.practitionerID;
}

// Subroutine to check if PractitionerRole exists for a Practitioner and Organization
async function checkPractitionerRole(practitionerId, organizationId) {
  try {
    const response = await fetch(`${base}/api/role/findPractitionerRole?practitioner=${practitionerId}&organizationId=${organizationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to check PractitionerRole: ${response.statusText}`);
    }

    const result = await response.json();
    return result.exists; // Assuming API returns an 'exists' field indicating if the role exists
  } catch (error) {
    console.error('Error checking PractitionerRole:', error);
    return false; // If there's an error, treat it as if the role doesn't exist
  }
}

// Subroutine to create a new PractitionerRole
async function createNewPractitionerRole(practitionerId, organizationId) {
  const newPractitionerRoleData = {
    practitionerId: practitionerId,  // Pass practitionerId as a string
    organizationId: organizationId,  // Pass organizationId as a string
    roles: [] // Initially no roles, roles will be patched later
  };

  const response = await fetch(`${base}/api/role/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPractitionerRoleData),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(`Failed to create PractitionerRole: ${result.error || 'Unknown error'}`);
  }
}

// Subroutine to patch roles for the PractitionerRole
async function patchRoles(practitionerId, organizationId) {
  const selectedRoles = roles.filter(role => role.selected).map(role => role.code);
  if (selectedRoles.length === 0) {
    throw new Error('Please select at least one role.');
  }

  const patchRoleData = {
    practitioner: { reference: `Practitioner/${practitionerId}` },
    organization: { reference: `Organization/${organizationId}` },
    roles: selectedRoles,
  };

  const response = await fetch(`${base}/api/role/patchRoles`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patchRoleData),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(`Failed to patch roles: ${result.error || 'Unknown error'}`);
  }
}

    

    
    // Reset form fields
    function resetForm() {
      firstName = '';
      lastName = '';
      dob = '';
      npi = '';
      phone = '';
      email = '';
      roles.forEach(role => (role.selected = false));
    }
  </script>
  
  <!-- Staff Form UI -->
  <div class="add-staff-container">
    <h2>Add New Staff Member</h2>
  
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
        <input id="dob" type="date" bind:value={dob} >
      </div>
  
      <div class="form-group">
        <label for="npi">NPI:</label>
        <input id="npi" type="text" bind:value={npi} >
      </div>
  
      <div class="form-group">
        <label for="phone">Text Phone:</label>
        <input id="phone" type="tel" bind:value={phone} >
      </div>
  
      <div class="form-group">
        <label for="email">Email:</label>
        <input id="email" type="email" bind:value={email} >
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
        {#if loading}Submitting...{/if}
        {#if !loading}Submit{/if}
      </button>
    </form>
  </div>
  
 
  
  <style>
    .add-staff-container {
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
  </style>
  