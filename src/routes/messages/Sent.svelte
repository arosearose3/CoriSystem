<!-- Sent.svelte -->
<script>
    let sentMessages = [
      {
        id: 1,
        eventCoding: { code: 'appointment-confirmation', display: 'Appointment Confirmation' },
        source: { name: 'Doctor’s Office', endpointUrl: 'http://doctors-office.com' },
        destination: { name: 'Patient Portal', receiver: 'John Doe' },
        reason: 'Confirming the appointment for tomorrow'
      },
      {
        id: 2,
        eventCoding: { code: 'lab-results', display: 'Lab Results' },
        source: { name: 'Lab System', endpointUrl: 'http://lab-system.com' },
        destination: { name: 'Patient Portal', receiver: 'Jane Smith' },
        reason: 'Lab results ready for viewing'
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
  
  <h3>Sent Messages</h3>
  
  {#each sentMessages as message}
    <div class="message">
      <h4>Event: {message.eventCoding.display} (Code: {message.eventCoding.code})</h4>
      <p><strong>From:</strong> {message.source.name} ({message.source.endpointUrl})</p>
      <p><strong>To:</strong> {message.destination.name} (Receiver: {message.destination.receiver})</p>
      <p><strong>Reason:</strong> {message.reason}</p>
    </div>
  {/each}
  