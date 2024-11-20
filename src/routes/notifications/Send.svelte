<!-- Send.svelte -->
<script>
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';

    let message = '';
    let phoneNumber = '';
    const maxLength = 160;
    const dispatcher = createEventDispatcher();

    async function sendMessage() {
      if (message.length > maxLength) {
        alert('Message exceeds maximum length of 160 characters');
        return;
      }
      if (!/^[0-9+]*$/.test(phoneNumber)) {
        alert('Phone number contains invalid characters');
        return;
      }
      try {
        const response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message, phoneNumber })
        });
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        const result = await response.json();
        console.log(result);
        dispatcher('sent', { message });
      } catch (error) {
        console.error(error);
      }
    }
</script>

<style>
    .send-container {
      max-width: 400px;
      margin: auto;
      padding: 1em;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .input-group {
      margin-bottom: 1em;
    }
    .input-group label {
      display: block;
      margin-bottom: 0.5em;
    }
    .input-group input, .input-group textarea {
      width: 100%;
      padding: 0.5em;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    button {
      padding: 0.5em 1em;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
</style>

<div class="send-container">
    <div class="input-group">
        <label for="phone-number">Phone Number</label>
        <input type="text" id="phone-number" bind:value={phoneNumber} placeholder="Enter phone number" />
    </div>
    <div class="input-group">
        <label for="message">Message</label>
        <textarea id="message" bind:value={message} placeholder="Enter your message (max 160 characters)" maxlength={maxLength}></textarea>
    </div>
    <button on:click={sendMessage}>Send</button>
</div>