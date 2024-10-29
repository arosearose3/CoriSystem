<script>
    let sentMessages = [
        { id: 1, to: '+1234567890', body: 'This is a sent message.' },
        { id: 2, to: '+0987654321', body: 'Another message sent.' }
    ];
</script>

<style>
    .sent-container {
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
    .to {
      font-weight: bold;
    }
</style>

<div class="sent-container">
    {#each sentMessages as message}
        <div class="message">
            <div class="to">To: {message.to}</div>
            <div class="body">{message.body}</div>
        </div>
    {/each}
</div>