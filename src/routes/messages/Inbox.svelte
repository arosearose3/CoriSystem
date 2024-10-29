<!-- Inbox.svelte -->
<script>
    let messages = [
      {
        id: 1,
        eventCoding: { code: 'new-appointment', display: 'New Appointment' },
        source: { name: 'Hospital System', endpointUrl: 'http://hospital-system.com' },
        destination: { name: 'Doctor’s Office', receiver: 'Dr. Smith' },
        reason: 'Scheduling a new appointment'
      },
      {
        id: 2,
        eventCoding: { code: 'patient-discharge', display: 'Patient Discharge' },
        source: { name: 'Discharge System', endpointUrl: 'http://discharge-system.com' },
        destination: { name: 'Care Provider', receiver: 'Nurse Jackson' },
        reason: 'Discharging the patient to home care'
      }
    ];
  </script>
  
  <style>
    .message {
      border-bottom: 1px solid #ccc;
      padding: 1em 0;
    }
  
    .message h4 {
      margin: 0;
    }
  </style>
  
  <h3>Inbox</h3>
  
  {#each messages as message}
    <div class="message">
      <h4>Event: {message.eventCoding.display} (Code: {message.eventCoding.code})</h4>
      <p><strong>From:</strong> {message.source.name} ({message.source.endpointUrl})</p>
      <p><strong>To:</strong> {message.destination.name} (Receiver: {message.destination.receiver})</p>
      <p><strong>Reason:</strong> {message.reason}</p>
    </div>
  {/each}
  