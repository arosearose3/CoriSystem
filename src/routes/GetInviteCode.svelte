<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    let inviteCode = '';
    let errorMessage = '';
    let isSubmitting = false;
  
    async function handleSubmit() {
      if (!inviteCode.trim()) {
        errorMessage = 'Please enter an invite code';
        return;
      }
  
      isSubmitting = true;
      errorMessage = '';
  
      try {
        dispatch('submitInviteCode', { inviteCode: inviteCode.trim() });
      } catch (error) {
        errorMessage = 'Error submitting invite code. Please try again.';
        console.error('Error:', error);
      } finally {
        isSubmitting = false;
      }
    }
  </script>
  
  <div class="invite-code-container">
    <h2>Enter Invite Code</h2>
    <p class="description">
      Please enter your invite code to continue. If you don't have an invite code, 
      please contact your organization administrator.
    </p>
  
    <form on:submit|preventDefault={handleSubmit} class="invite-form">
      <div class="form-group">
        <label for="inviteCode">Invite Code</label>
        <input
          type="text"
          id="inviteCode"
          bind:value={inviteCode}
          placeholder="Enter your invite code"
          disabled={isSubmitting}
        />
      </div>
  
      {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
      {/if}
  
      <button type="submit" disabled={isSubmitting} class="submit-button">
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  </div>
  
  <style>
    .invite-code-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
  
    h2 {
      margin: 0 0 1rem;
      color: #333;
      text-align: center;
    }
  
    .description {
      color: #666;
      margin-bottom: 1.5rem;
      text-align: center;
      font-size: 0.9rem;
    }
  
    .invite-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  
    label {
      font-weight: 500;
      color: #444;
    }
  
    input {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
  
    input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
  
    input:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
  
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
  
    .submit-button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
  
    .submit-button:hover:not(:disabled) {
      background-color: #0056b3;
    }
  
    .submit-button:disabled {
      background-color: #b3d7ff;
      cursor: not-allowed;
    }
  </style>