<script>
  import { onMount } from 'svelte';
  import Switch from './Switch.svelte';
  import { base } from '$app/paths'; // Import base path

  // State variables
  let textConsent = false; // Boolean value (source of truth)
  let textConsentOption = textConsent ? 'Yes' : 'No'; // Initialize based on textConsent

  let notificationEmail = '';
  let phoneNumber = '';
  let message = '';

  // Switch options as strings
  const switchOptions = ['Yes', 'No'];

  // Fetch initial data when component mounts
  onMount(async () => {
    // await getSMS();
    // await getEmail();
  });

  // Handle changes from the Switch component
  function handleSwitchChange(event) {
    textConsentOption = event.detail.value; // Capture the new value from the Switch
    textConsent = textConsentOption === 'Yes'; // Update textConsent based on the option
    console.log('handleSwitchChange:', { textConsentOption, textConsent });
  }

  // Handlers for getting and updating email and SMS settings
  async function getSMS() {
    try {
      const response = await fetch(`${base}/api/settings/getSMS`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        textConsent = data.consent ?? false;
        textConsentOption = textConsent ? 'Yes' : 'No'; // Update textConsentOption
        phoneNumber = data.phoneNumber || '';
      } else {
        console.error('Failed to fetch SMS settings');
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
    }
  }

  async function getEmail() {
    try {
      const response = await fetch(`${base}/api/settings/getEmail`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        notificationEmail = data.email || '';
      } else {
        console.error('Failed to fetch email settings');
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  }

  async function updateSMS() {
    try {
      const response = await fetch(`${base}/api/settings/updateSMS`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: textConsent, phoneNumber: phoneNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to update SMS settings');
      }
      message = 'SMS settings updated successfully';
    } catch (error) {
      console.error('Error updating SMS settings:', error);
      message = 'Error updating SMS settings';
    }
  }

  async function updateEmail() {
    try {
      const response = await fetch(`${base}/api/settings/updateEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notificationEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to update email settings');
      }
      message = 'Email settings updated successfully';
    } catch (error) {
      console.error('Error updating email settings:', error);
      message = 'Error updating email settings';
    }
  }

  // Submit handler for the form
  async function handleSubmit() {
  //  await updateSMS();
  //  await updateEmail();
  }
</script>
<div class="settings-container">
  <h2>Settings</h2>

  <div class="toggle-group">
    <Switch
      bind:value={textConsentOption}
      label="Text Message Consent?"
      design="multi"
      options={switchOptions}
      fontSize={12}
      on:change={handleSwitchChange}
    />
   
  </div>

  <div class="input-group">
    <label for="email">Notification Email:</label>
    <input
      type="email"
      id="email"
      bind:value={notificationEmail}
      placeholder="Enter your notification email"
    />
  </div>

  {#if textConsent}
    <div class="input-group">
      <label for="phone">Phone Number For Texts:</label>
      <input
        type="tel"
        id="phone"
        bind:value={phoneNumber}
        placeholder="Enter your phone number"
      />
    </div>
  {/if}

  <button on:click={handleSubmit}>Submit</button>

  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>


<style>
  .settings-container {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .toggle-group,
  .input-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 5px;
  }

  input[type='text'],
  input[type='email'],
  input[type='tel'] {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  button {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }

  button:hover {
    background-color: #45a049;
  }

  .message {
    margin-top: 15px;
    padding: 10px;
    background-color: #e0f7fa;
    border-radius: 4px;
    color: #00796b;
  }
</style>
