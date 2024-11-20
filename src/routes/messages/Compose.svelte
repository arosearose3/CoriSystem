<!-- Compose.svelte -->
<script>
    let eventCoding = { code: '', system: '', display: '' };
    let source = { name: '', software: '', version: '', contact: '', endpointUrl: '' };
    let destination = { name: '', endpointUrl: '', receiver: '' };
    let reason = '';
  </script>
  
  <style>
    form {
      display: flex;
      flex-direction: column;
    }
  
    textarea, input {
      margin-bottom: 1em;
      padding: 0.5em;
    }
  
    button {
      padding: 0.5em 1em;
      background-color: #007bff;
      color: white;
      border: none;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #0056b3;
    }
  </style>
  
  <h3>Compose a New Message (FHIR MessageHeader)</h3>
  
  <form on:submit|preventDefault={() => console.log({ eventCoding, source, destination, reason })}>
    <label>
      Event Coding (Code, System, Display):
      <input type="text" placeholder="Code" bind:value={eventCoding.code} />
      <input type="text" placeholder="System" bind:value={eventCoding.system} />
      <input type="text" placeholder="Display" bind:value={eventCoding.display} />
    </label>
  
    <label>
      Source (Name, Software, Version, Contact, Endpoint URL):
      <input type="text" placeholder="Name" bind:value={source.name} />
      <input type="text" placeholder="Software" bind:value={source.software} />
      <input type="text" placeholder="Version" bind:value={source.version} />
      <input type="text" placeholder="Contact" bind:value={source.contact} />
      <input type="text" placeholder="Endpoint URL" bind:value={source.endpointUrl} />
    </label>
  
    <label>
      Destination (Name, Endpoint URL, Receiver):
      <input type="text" placeholder="Name" bind:value={destination.name} />
      <input type="text" placeholder="Endpoint URL" bind:value={destination.endpointUrl} />
      <input type="text" placeholder="Receiver" bind:value={destination.receiver} />
    </label>
  
    <label>
      Reason:
      <textarea rows="3" bind:value={reason}></textarea>
    </label>
  
    <button type="submit">Send Message</button>
  </form>
  