<script>
    import { onMount } from 'svelte';
  
    let patient = {
      name: [{ family: '', given: [''] }],
      birthDate: '',
      gender: 'unknown',
      telecom: [{ system: 'phone', value: '' }],
      address: [{ line: [''], city: '', state: '', postalCode: '' }]
    };
  
    let message = '';
  
    async function handleSubmit() {
      try {
        const response = await fetch('/avail/api/patient/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(patient)
        });
  
        if (response.ok) {
          const result = await response.json();
          message = 'Patient added successfully!';
          resetForm();
        } else {
          const errorData = await response.json();
          message = `Error: ${errorData.error}`;
        }
      } catch (error) {
        message = `Failed to add patient: ${error.message}`;
      }
    }
  
    function resetForm() {
      patient = {
        name: [{ family: '', given: [''] }],
        birthDate: '',
        gender: 'unknown',
        telecom: [{ system: 'phone', value: '' }],
        address: [{ line: [''], city: '', state: '', postalCode: '' }]
      };
    }
  </script>
  
  <div class="container">
    <h2>Add New Patient</h2>
    <form on:submit|preventDefault={handleSubmit}>
      <div>
        <label>First Name</label>
        <input type="text" bind:value={patient.name[0].given[0]} required />
      </div>
  
      <div>
        <label>Last Name</label>
        <input type="text" bind:value={patient.name[0].family} required />
      </div>
  
      <div>
        <label>Birth Date</label>
        <input type="date" bind:value={patient.birthDate} required />
      </div>
  
      <div>
        <label>Gender</label>
        <select bind:value={patient.gender}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
  
      <div>
        <label>Phone</label>
        <input type="tel" bind:value={patient.telecom[0].value} />
      </div>
  
      <div>
        <label>Address</label>
        <input type="text" placeholder="Line 1" bind:value={patient.address[0].line[0]} />
        <input type="text" placeholder="City" bind:value={patient.address[0].city} />
        <input type="text" placeholder="State" bind:value={patient.address[0].state} />
        <input type="text" placeholder="Postal Code" bind:value={patient.address[0].postalCode} />
      </div>
  
      <button type="submit">Submit</button>
    </form>
  
    {#if message}
      <p>{message}</p>
    {/if}
  </div>
  
  <style>
    .container {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
  
    h2 {
      margin-bottom: 20px;
    }
  
    label {
      display: block;
      margin-bottom: 5px;
    }
  
    input, select {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  
    button {
      padding: 10px 15px;
      background-color: #4CAF50;
      color: white;
      border: none;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #45a049;
    }
  
    p {
      margin-top: 15px;
      color: green;
    }
  </style>
  