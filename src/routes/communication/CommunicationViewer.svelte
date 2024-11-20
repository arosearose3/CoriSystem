<script>
  import { onMount } from 'svelte';
  import { wsStore } from '$lib/websocketStore';
  import { user } from '$lib/stores';
  
  let loading = true;
  let error = null;
  
  $: practitionerId = $user?.practitioner?.Pid;
  $: messages = $wsStore.messages;
  $: unreadCount = $wsStore.unreadCount;

  async function loadMessages() {
    if (!practitionerId) {
      error = 'No practitioner ID available';
      loading = false;
      return;
    }

    try {
      loading = true;
      const response = await fetch(`/api/communication?recipient=Practitioner/${practitionerId}&_sort=-sent`);
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      messages = data.entry?.map(e => e.resource) || [];
    } catch (err) {
      error = err.message;
      console.error('Error loading messages:', err);
    } finally {
      loading = false;
    }
  }

  async function markAsRead(messageId) {
    if (!practitionerId) {
      console.error('No practitioner ID available');
      return;
    }

    try {
      const response = await fetch(`/api/communication/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          received: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to mark message as read');

      messages = messages.map(m => 
        m.id === messageId 
          ? { ...m, received: new Date().toISOString() }
          : m
      );
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  }

  onMount(() => {
    if (practitionerId) {
      loadMessages();
    }
  });

  // Helper function to format sender/recipient references
  function formatReference(reference) {
    if (!reference) return '';
    const [type, id] = reference.split('/');
    return `${type} ${id}`;
  }
</script>

  
  <div class="communication-viewer">
    <h3>Messages</h3>
  
    {#if error}
      <div class="error">{error}</div>
    {/if}
  
    {#if loading}
      <div class="loading">Loading messages...</div>
    {:else if !practitionerId}
      <div class="error">Practitioner information not available</div>
    {:else if messages.length === 0}
      <div class="empty">No messages</div>
    {:else}
      <div class="messages">
        {#each messages as message (message.id)}
          <div class="message" class:unread={!message.received}>
            <div class="message-header">
              <span class="sender">{formatReference(message.sender.reference)}</span>
              <span class="time">{new Date(message.sent).toLocaleString()}</span>
            </div>
            <div class="message-content">
              {message.payload[0].contentString}
            </div>
            {#if !message.received}
              <button 
                class="mark-read"
                on:click={() => markAsRead(message.id)}
              >
                Mark as read
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <style>
    .communication-viewer {
      padding: 1rem;
      max-width: 800px;
    }
  
    .messages {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  
    .message {
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  
    .message.unread {
      background-color: #f0f7ff;
      border-color: #0066cc;
    }
  
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
  
    .sender {
      font-weight: bold;
    }
  
    .time {
      color: #666;
    }
  
    .mark-read {
      margin-top: 0.5rem;
      background-color: #0066cc;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
    }
  
    .error {
      color: red;
      margin-bottom: 1rem;
    }
  
    .loading, .empty {
      text-align: center;
      color: #666;
      padding: 2rem;
    }
  </style>