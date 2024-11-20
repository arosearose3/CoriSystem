<!-- Received.svelte -->
<script>
    let receivedMessages = [
        { id: 1, from: '+1234567890', body: 'Hello, this is a received message.' },
        { id: 2, from: '+0987654321', body: 'Another message received.' }
    ];
</script>

<style>
    .received-container {
      max-width: 600px;
      margin: auto;
      padding: 1em;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .message {
      padding: 1em;
      border-bottom: 1px solid #ddd;
    }
    .message:last-child {
      border-bottom: none;
    }
    .from {
      font-weight: bold;
    }
</style>

<div class="received-container">
    {#each receivedMessages as message}
        <div class="message">
            <div class="from">From: {message.from}</div>
            <div class="body">{message.body}</div>
        </div>
    {/each}
</div>