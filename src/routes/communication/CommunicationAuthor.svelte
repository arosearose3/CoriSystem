<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { user } from '$lib/stores.js';
    import axios from 'axios';
  
    const dispatch = createEventDispatcher();
    let message = '';
    let selectedRecipientId = '';
    let practitioners = [];
    let saving = false;
    let error = null;
    let loading = true;
  
    // Get practitioner and organization reference from store
    $: practitionerRef = $user?.practitioner?.Pid 
        ? `Practitioner/${$user.practitioner.Pid}`
        : null;
    $: organizationId = $user?.practitioner?.organizationId;
  
    async function loadPractitioners() {
        if (!organizationId) {
            error = 'Organization ID not available';
            loading = false;
            return;
        }
  
        try {
            const response = await axios.get('/api/practitioner/getStaffForOrg', {
                params: { organizationId }
            });
  
            // Ensure response data is a valid FHIR Bundle
            const entries = response.data?.entry || [];
            
            practitioners = entries
                .filter(entry => entry?.resource?.resourceType === 'Practitioner')
                .map(entry => {
                    const resource = entry.resource;
                    const name = resource.name?.[0];
                    const given = name?.given?.[0] || '';
                    const family = name?.family || '';
                    const email = resource.telecom?.find(t => t.system === 'email')?.value || 'No email';
  
                    return {
                        id: resource.id,
                        name: `${given} ${family}`.trim(),
                        email
                    };
                });
  
            // Remove current user from the list
            practitioners = practitioners.filter(p => p.id !== $user?.practitioner?.Pid);
  
            loading = false;
        } catch (err) {
            error = 'Failed to load staff members';
            console.error('Error loading practitioners:', err);
            loading = false;
        }
    }
  
    async function sendCommunication() {
        if (!practitionerRef) {
            error = 'You must be logged in as a practitioner to send messages';
            return;
        }
  
        if (!selectedRecipientId || !message) {
            error = 'Please fill in all fields';
            return;
        }
  
        saving = true;
        error = null;
  
        try {
            const response = await fetch('/api/communication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resourceType: 'Communication',
                    status: 'completed',
                    sent: new Date().toISOString(),
                    recipient: [{ reference: `Practitioner/${selectedRecipientId}` }],
                    sender: { reference: practitionerRef },
                    payload: [{ contentString: message }]
                })
            });
  
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || 'Failed to send message');
            }
  
            message = '';
            selectedRecipientId = '';
            dispatch('sent');
        } catch (err) {
            error = err.message;
            console.error('Error sending message:', err);
        } finally {
            saving = false;
        }
    }
  
    onMount(() => {
        loadPractitioners();
    });
  </script>
  
  <div class="communication-author">
    <h3>Send Message to Staff</h3>
  
    {#if !practitionerRef}
        <div class="error">You must be logged in as a practitioner to send messages</div>
    {:else if loading}
        <div class="loading">Loading staff members...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else}
        <div class="form-group">
            <label for="recipient">Recipient:</label>
            <select id="recipient" bind:value={selectedRecipientId} disabled={saving} class="recipient-select">
                <option value="">Select a staff member</option>
                {#each practitioners as practitioner}
                    <option value={practitioner.id}>
                        {practitioner.name} - {practitioner.email}
                    </option>
                {/each}
            </select>
        </div>
  
        <div class="form-group">
            <label for="message">Message:</label>
            <textarea
                id="message"
                bind:value={message}
                disabled={saving}
                placeholder="Type your message here"
                rows="4"
            ></textarea>
        </div>
  
        <div class="button-group">
            <button on:click={sendCommunication} disabled={saving || !selectedRecipientId} class="send-button">
                {saving ? 'Sending...' : 'Send Message'}
            </button>
  
            <button on:click={loadPractitioners} disabled={saving} class="refresh-button" title="Refresh staff list">
                ↻
            </button>
        </div>
    {/if}
  </div>
  
  
  

<style>
  .communication-author {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
  }
  
  .form-group {
      margin-bottom: 1rem;
  }
  
  label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
  }
  
  input, textarea, select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background-color: white;
      transition: border-color 0.15s ease;
  }
  
  .recipient-select {
      color: #374151;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
  }
  
  input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  
  input:disabled, textarea:disabled, select:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
  }
  
  .button-group {
      display: flex;
      gap: 0.5rem;
      align-items: center;
  }
  
  .send-button {
      flex: 1;
      background-color: #2563eb;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.15s ease;
  }
  
  .refresh-button {
      padding: 0.5rem;
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      transition: all 0.15s ease;
  }
  
  .refresh-button:hover:not(:disabled) {
      background-color: #e5e7eb;
  }
  
  .send-button:hover:not(:disabled) {
      background-color: #1d4ed8;
  }
  
  .send-button:disabled, .refresh-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
  }
  
  .error {
      color: #dc2626;
      margin-bottom: 1rem;
      padding: 0.5rem;
      border-radius: 0.375rem;
      background-color: #fee2e2;
      border: 1px solid #fca5a5;
  }
  
  .loading {
      color: #6b7280;
      text-align: center;
      padding: 1rem;
  }
</style>