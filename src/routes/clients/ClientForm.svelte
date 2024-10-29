<script>
  import { base } from '$app/paths'; // Import base path
  
    // Initial client (patient) object to bind form fields to
    let client = {
      identifier: '',
      active: false,
      name: '',
      telecom: '',
      gender: 'unknown',
      birthDate: '',
      address: {
        line: '',
        city: '',
        state: '',
        postalCode: ''
      },
      maritalStatus: '',
      multipleBirthBoolean: false,
      photo: '',
      contact: {
        name: '',
        relationship: '',
        telecom: '',
        address: {
          line: '',
          city: '',
          state: '',
          postalCode: ''
        }
      }
    };
  
    // Submit form handler
    function submitForm() {
      console.log('New Client (Patient):', client);
    }
  </script>
  
  <style>
    form {
      display: flex;
      flex-direction: column;
      gap: 1em;
    }
  
    input, select, textarea {
      padding: 0.5em;
      font-size: 1em;
    }
  
    button {
      padding: 0.7em;
      background-color: #007bff;
      color: white;
      border: none;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #0056b3;
    }
  </style>
  
  <h3>Create a New Client</h3>
  
  <form on:submit|preventDefault={submitForm}>
    <!-- Identifier -->
    <label>
      Identifier:
      <input type="text" bind:value={client.identifier} />
    </label>
  
    <!-- Active -->
    <label>
      Active:
      <input type="checkbox" bind:checked={client.active} />
    </label>
  
    <!-- Name -->
    <label>
      Name:
      <input type="text" bind:value={client.name} />
    </label>
  
    <!-- Telecom (Contact Info) -->
    <label>
      Contact (Phone/Email):
      <input type="text" bind:value={client.telecom} />
    </label>
  
    <!-- Gender -->
    <label>
      Gender:
      <select bind:value={client.gender}>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
        <option value="unknown">Unknown</option>
      </select>
    </label>
  
    <!-- Birth Date -->
    <label>
      Date of Birth:
      <input type="date" bind:value={client.birthDate} />
    </label>
  
    <!-- Address -->
    <fieldset>
      <legend>Address</legend>
      <label>
        Street Address:
        <input type="text" bind:value={client.address.line} />
      </label>
      <label>
        City:
        <input type="text" bind:value={client.address.city} />
      </label>
      <label>
        State:
        <input type="text" bind:value={client.address.state} />
      </label>
      <label>
        Postal Code:
        <input type="text" bind:value={client.address.postalCode} />
      </label>
    </fieldset>
  
    <!-- Marital Status -->
    <label>
      Marital Status:
      <input type="text" bind:value={client.maritalStatus} />
    </label>
  
    <!-- Multiple Birth -->
    <label>
      Is Part of a Multiple Birth:
      <input type="checkbox" bind:checked={client.multipleBirthBoolean} />
    </label>
  
    <!-- Photo -->
    <label>
      Photo URL:
      <input type="text" bind:value={client.photo} />
    </label>
  
    <!-- Contact Information -->
    <fieldset>
      <legend>Emergency Contact</legend>
      <label>
        Name:
        <input type="text" bind:value={client.contact.name} />
      </label>
      <label>
        Relationship:
        <input type="text" bind:value={client.contact.relationship} />
      </label>
      <label>
        Contact (Phone/Email):
        <input type="text" bind:value={client.contact.telecom} />
      </label>
      <label>
        Address:
        <input type="text" bind:value={client.contact.address.line} />
      </label>
      <label>
        City:
        <input type="text" bind:value={client.contact.address.city} />
      </label>
      <label>
        State:
        <input type="text" bind:value={client.contact.address.state} />
      </label>
      <label>
        Postal Code:
        <input type="text" bind:value={client.contact.address.postalCode} />
      </label>
    </fieldset>
  
    <button type="submit">Submit</button>
  </form>
  