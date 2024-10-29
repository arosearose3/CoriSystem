<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; // Import base path

    let givenName = '';
    let familyName = '';
    let email = '';
    let birthDate = '';
    let message = '';
  
    async function handleSubmit() {
      const practitionerData = {
        resourceType: "Practitioner",
        name: [
          {
            use: "official",
            family: familyName,
            given: [givenName]
          }
        ],
        telecom: [
          {
            system: "email",
            value: email
          }
        ],
        birthDate: birthDate
      };
  
      try {
        const response = await fetch(`${base}/api/practitioner/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(practitionerData),
        });
  
        const result = await response.json();
  
        if (response.ok) {
          message = `Practitioner added successfully. ${result.data && result.data.id ? `ID: ${result.data.id}` : ''}`;
          givenName = '';
          familyName = '';
          email = '';
          birthDate = '';
        } else {
          message = `Error: ${result.error || 'Unknown error occurred'}`;
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        message = `Error: ${error.message || 'Unknown error occurred'}`;
      }
    }
  </script>
  

  
  <div class="container">
    <h2>Add Practitioner</h2>
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="givenName">Given Name:</label>
        <input type="text" id="givenName" bind:value={givenName} required>
      </div>
      <div class="form-group">
        <label for="familyName">Family Name:</label>
        <input type="text" id="familyName" bind:value={familyName} required>
      </div>
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" bind:value={email} required>
      </div>
      <div class="form-group">
        <label for="birthDate">Birth Date:</label>
        <input type="date" id="birthDate" bind:value={birthDate} required>
      </div>
      <button type="submit">Add Practitioner</button>
    </form>
    {#if message}
      <p class="message">{message}</p>
    {/if}
  </div>
  
  <style>
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
    }
    input {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      cursor: pointer;
    }
    .message {
      margin-top: 15px;
      padding: 10px;
      background-color: #f0f0f0;
      border-radius: 4px;
    }
  </style>