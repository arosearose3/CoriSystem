<!-- Trash.svelte -->
<script>
    let trashedMessages = [
      {
        id: 1,
        eventCoding: { code: 'cancel-appointment', display: 'Cancelled Appointment' },
        source: { name: 'Hospital System', endpointUrl: 'http://hospital-system.com' },
        destination: { name: 'Doctor’s Office', receiver: 'Dr. Smith' },
        reason: 'Cancelled due to a schedule conflict'
      },
      {
        id: 2,
        eventCoding: { code: 'message-error', display: 'Message Error' },
        source: { name: 'Discharge System', endpointUrl: 'http://discharge-system.com' },
        destination: { name: 'Care Provider', receiver: 'Nurse Jackson' },
        reason: 'Error processing discharge message'
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
  
  <h3>Trash</h3>
  
  {#each trashedMessages as message}
    <div class="message">
      <h4>Event: {message.eventCoding.display} (Code: {message.eventCoding.code})</h4>
      <p><strong>From:</strong> {message.source.name} ({message.source.endpointUrl})</p>
      <p><strong>To:</strong> {message.destination.name} (Receiver: {message.destination.receiver})</p>
      <p><strong>Reason:</strong> {message.reason}</p>
    </div>
  {/each}
  