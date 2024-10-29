<script>

import { base } from '$app/paths'; // Import base path

  let organizationData = {
    active: true,
    type: [{ coding: [{ code: 'prov', system: 'http://terminology.hl7.org/CodeSystem/organization-type' }] }],
    name: '', // Changed to string, not array
    alias: [''],
    contact: [{
      purpose: { coding: [{ code: 'ADMIN' }] },
      name: { text: '' }, // Changed to an object
      telecom: [
        { system: 'phone', value: '' },
        { system: 'email', value: '' },
        { system: 'fax', value: '' }
      ],
      address: {
        use: 'work',
        type: 'both',
        line: [''], // Address lines need to be strings
        city: '',
        state: '',
        postalCode: '',
        country: ''
      }
    }]
  };

  let errors = {};

  // Function to validate form
  function validateForm() {
    errors = {}; // Reset errors
    let valid = true;

    if (!organizationData.name) {
      errors.name = "Organization name is required.";
      valid = false;
    }

    if (organizationData.alias.some(alias => !alias.trim())) {
      errors.alias = "Alias cannot be empty.";
      valid = false;
    }

    const contact = organizationData.contact[0];
    
    if (!contact.name.text) {
      errors.contactName = "Contact name is required.";
      valid = false;
    }

    if (!contact.telecom[0].value) {
      errors.phone = "Phone number is required.";
      valid = false;
    }

    if (!contact.telecom[1].value) {
      errors.email = "Email is required.";
      valid = false;
    }

    if (!contact.telecom[2].value) {
      errors.email = "Fax is required.";
      valid = false;
    }

    if (!contact.address.line[0]) {
      errors.addressLine = "Address line is required.";
      valid = false;
    }

    if (!contact.address.city) {
      errors.city = "City is required.";
      valid = false;
    }

    if (!contact.address.state) {
      errors.state = "State is required.";
      valid = false;
    }

    if (!contact.address.postalCode) {
      errors.postalCode = "Postal code is required.";
      valid = false;
    }

    if (!contact.address.country) {
      errors.country = "Country is required.";
      valid = false;
    }

    return valid;
  }

  // Handle form submit
  async function handleSubmit() {
    if (validateForm()) {
      try {
        const response = await fetch(`${base}/api/organization/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(organizationData)
        });

        if (response.ok) {
          alert('Organization added successfully');
          resetForm();
        } else {
          alert('Failed to add organization');
        }
      } catch (error) {
        console.error('Error adding organization:', error);
        alert('Error adding organization');
      }
    } else {
      alert('Please fix the errors in the form.');
    }
  }

  // Reset form
  function resetForm() {
    organizationData = {
      active: true,
      type: [{ coding: [{ code: 'prov', system: 'http://terminology.hl7.org/CodeSystem/organization-type' }] }],
      name: '',
      alias: [''],
      contact: [{
        purpose: { coding: [{ code: 'ADMIN' }] },
        name: { text: '' },
        telecom: [
          { system: 'phone', value: '' },
          { system: 'email', value: '' },
          { system: 'fax', value: '' }
        ],
        address: {
          use: 'work',
          type: 'both',
          line: [''],
          city: '',
          state: '',
          postalCode: '',
          country: ''
        }
      }]
    };
  }
</script>

<!-- Form template -->
<div class="add-organization">
  <h2>Add Organization</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <label>
      Name:
      <input type="text" bind:value={organizationData.name} required>
      {#if errors.name}<span class="error">{errors.name}</span>{/if}
    </label>

    <label>
      Alias:
      {#each organizationData.alias as alias, i}
        <input type="text" bind:value={organizationData.alias[i]} required>
      {/each}
      {#if errors.alias}<span class="error">{errors.alias}</span>{/if}
    </label>

    <fieldset>
      <legend>Contact Information</legend>

      <label>
        Contact Name:
        <input type="text" bind:value={organizationData.contact[0].name.text}>
        {#if errors.contactName}<span class="error">{errors.contactName}</span>{/if}
      </label>

      <label>
        Phone:
        <input type="tel" bind:value={organizationData.contact[0].telecom[0].value}>
        {#if errors.phone}<span class="error">{errors.phone}</span>{/if}
      </label>

      <label>
        Email:
        <input type="email" bind:value={organizationData.contact[0].telecom[1].value}>
        {#if errors.email}<span class="error">{errors.email}</span>{/if}
      </label>

      <label>
        Fax:
        <input type="fax" bind:value={organizationData.contact[0].telecom[2].value}>
        {#if errors.fax}<span class="error">{errors.fax}</span>{/if}
      </label>

      <fieldset>
        <legend>Address</legend>

        <label>
          Street:
          <input type="text" bind:value={organizationData.contact[0].address.line[0]}>
          {#if errors.addressLine}<span class="error">{errors.addressLine}</span>{/if}
        </label>

        <label>
          City:
          <input type="text" bind:value={organizationData.contact[0].address.city}>
          {#if errors.city}<span class="error">{errors.city}</span>{/if}
        </label>

        <label>
          State:
          <input type="text" bind:value={organizationData.contact[0].address.state}>
          {#if errors.state}<span class="error">{errors.state}</span>{/if}
        </label>

        <label>
          Postal Code:
          <input type="text" bind:value={organizationData.contact[0].address.postalCode}>
          {#if errors.postalCode}<span class="error">{errors.postalCode}</span>{/if}
        </label>

        <label>
          Country:
          <input type="text" bind:value={organizationData.contact[0].address.country}>
          {#if errors.country}<span class="error">{errors.country}</span>{/if}
        </label>
      </fieldset>
    </fieldset>

    <div class="button-group">
      <button type="submit">Submit</button>
      <button type="button" on:click={resetForm}>Cancel</button>
    </div>
  </form>
</div>

<style>
  .error {
    color: red;
    font-size: 0.9em;
  }

  .add-organization {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f0f0f0;
    border-radius: 8px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  label {
    display: flex;
    flex-direction: column;
  }

  input, textarea {
    margin-top: 5px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  fieldset {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
  }

  .button-group {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
  }

  button {
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: #0056b3;
  }

  button[type="button"] {
    background-color: #6c757d;
  }

  button[type="button"]:hover {
    background-color: #5a6268;
  }
</style>
