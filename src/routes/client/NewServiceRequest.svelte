<script>
    let patient = '';
    let requester = '';
    let performer = '';
    let intent = 'order'; // fixed value for ServiceRequest
    let priority = 'routine';
    let code = ''; // The type of service being requested
    let goals = [];
    let conditions = [];
    let selectedGoal = '';
    let selectedCondition = '';
    let consentGiven = false;
  
    // Placeholder routine to get patient's goals
    function getPatientGoals() {
      goals = [
        { id: 'goal1', description: 'Improve diet' },
        { id: 'goal2', description: 'Increase physical activity' }
      ];
    }
  
    // Placeholder routine to get patient's conditions
    function getPatientConditions() {
      conditions = [
        { id: 'condition1', name: 'Diabetes' },
        { id: 'condition2', name: 'Hypertension' }
      ];
    }
  
    // Placeholder function for creating consent
    function createConsentRecord() {
      console.log('Creating consent record...');
      // Logic for creating consent
    }
  
    function submitServiceRequest() {
      const serviceRequest = {
        resourceType: 'ServiceRequest',
        status: 'draft',
        intent,
        priority,
        code: {
          coding: [
            {
              system: 'http://example.com/codes',
              code,
              display: 'Requested Service'
            }
          ]
        },
        subject: {
          reference: `Patient/${patient}`
        },
        requester: {
          reference: `Practitioner/${requester}`
        },
        performer: {
          reference: `Organization/${performer}`
        },
 /*       basedOn: [
          {
            reference: `Goal/${selectedGoal}`
          }
        ],
        reasonReference: [
          {
            reference: `Condition/${selectedCondition}`
          }
        ] */
      };
      console.log('Service Request Created:', serviceRequest);
      // Add logic for submitting the service request
    }
  </script>
  
  <div>
    <h2>New Service Request</h2>
  
    <form on:submit|preventDefault={submitServiceRequest}>
      <!-- Patient field -->
      <label>
        Patient:
        <input type="text" placeholder="Enter patient ID" bind:value={patient} required />
      </label>
      <br />
  
      <!-- Requester field (Practitioner or Organization making the request) -->
      <label>
        Requester:
        <input type="text" placeholder="Enter requester ID" bind:value={requester} required />
      </label>
      <br />
  
      <!-- Performer field (Service-providing organization) -->
      <label>
        Performer:
        <input type="text" placeholder="Enter performer ID" bind:value={performer} required />
      </label>
      <br />
  
      <!-- Code field (Type of service requested) -->
      <label>
        Service Code:
        <input type="text" placeholder="Enter service code" bind:value={code} required />
      </label>
      <br />
  
      <!-- Priority field -->
      <label>
        Priority:
        <select bind:value={priority}>
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="asap">ASAP</option>
          <option value="stat">Stat</option>
        </select>
      </label>
      <br />
  
      <!-- Goals field (linked to Goal resource) -->
      <label>
        Select Goal:
        <select bind:value={selectedGoal}>
          <option>Select a goal</option>
          {#each goals as goal}
            <option value={goal.id}>{goal.description}</option>
          {/each}
        </select>
      </label>
      <br />
  
      <!-- Conditions field (linked to Condition resource) -->
      <label>
        Select Condition:
        <select bind:value={selectedCondition}>
          <option>Select a condition</option>
          {#each conditions as condition}
            <option value={condition.id}>{condition.name}</option>
          {/each}
        </select>
      </label>
      <br />
  
      <!-- Consent checkbox -->
      <label>
        <input type="checkbox" bind:checked={consentGiven} />
        Client Consent
      </label>
      <br />
  
      <!-- Create Consent button -->
      {#if !consentGiven}
        <button type="button" on:click={createConsentRecord}>Create Consent Record</button>
      {/if}
      <br />
  
      <!-- Submit button -->
      <button type="submit">Submit Service Request</button>
    </form>
  </div>
  
  <style>
    label {
      display: block;
      margin-bottom: 10px;
    }
    input, select {
      padding: 5px;
      margin-left: 10px;
    }
    button {
      margin-top: 10px;
      padding: 8px 12px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
  