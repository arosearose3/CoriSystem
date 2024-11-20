<!-- src/routes/referrals/Create.svelte -->
<script>
    let serviceRequest = {
      status: 'draft',
      intent: 'order',
      category: '',
      priority: 'routine',
      code: '',
      subject: '',
      requester: '',
      performer: '',
      occurrenceDateTime: '',
      reasonCode: '',
      note: ''
    };
  
    function submitForm() {
      console.log('Service Request:', serviceRequest);
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
  
  <h3>Create a New Referral (ServiceRequest)</h3>
  
  <form on:submit|preventDefault={submitForm}>
    <label>Status:
      <select bind:value={serviceRequest.status}>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="on-hold">On Hold</option>
      </select>
    </label>
  
    <label>Intent:
      <select bind:value={serviceRequest.intent}>
        <option value="proposal">Proposal</option>
        <option value="order">Order</option>
      </select>
    </label>
  
    <label>Priority:
      <select bind:value={serviceRequest.priority}>
        <option value="routine">Routine</option>
        <option value="urgent">Urgent</option>
        <option value="asap">ASAP</option>
      </select>
    </label>
  
    <label>Subject (Patient ID):
      <input type="text" bind:value={serviceRequest.subject} />
    </label>
  
    <label>Requester (Practitioner ID):
      <input type="text" bind:value={serviceRequest.requester} />
    </label>
  
    <label>Performer (Practitioner or Organization ID):
      <input type="text" bind:value={serviceRequest.performer} />
    </label>
  
    <label>Reason Code:
      <input type="text" bind:value={serviceRequest.reasonCode} />
    </label>
  
    <label>Occurrence DateTime:
      <input type="datetime-local" bind:value={serviceRequest.occurrenceDateTime} />
    </label>
  
    <label>Additional Notes:
      <textarea rows="4" bind:value={serviceRequest.note}></textarea>
    </label>
  
    <button type="submit">Submit Referral</button>
  </form>
  