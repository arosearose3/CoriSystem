<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores.js';
  import { base } from '$app/paths';
  import { fade } from 'svelte/transition';
  import { currentLanguage, activeTranslations } from '$lib/i18n';


    $: currentTranslations = $activeTranslations;
    $: translateText = (key) => {
      return currentTranslations[key] || key;
    };



  let loading = true;
  let error = null;
  let originalResource = null;
  let organizationId = null;

  let feedbackMessage = null;
  let feedbackType = 'success'; // or 'error'


  // Form state with all possible fields initialized
  let formData = {
    name: '',
    phone: '',
    fax: '',
    email: '',
    url: '',
    addressLine: '',
    city: '',
    state: 'CO',
    postalCode: '',
    country: 'US'
  };

  onMount(async () => {
    console.log ("In Org Settings");
    try {
      organizationId = $user.practitioner.organizationId;
      const response = await fetch(`${base}/api/organization/${organizationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch organization: ${response.status}`);
      }

      originalResource = await response.json();
      
      console.log ("org settings origR:",JSON.stringify(originalResource));

      // Extract values from the FHIR resource into our form structure
      formData = {
        name: originalResource.name || '',
        phone: originalResource.telecom?.find(t => t.system === 'phone')?.value || '',
        fax: originalResource.telecom?.find(t => t.system === 'fax')?.value || '',
        email: originalResource.telecom?.find(t => t.system === 'email')?.value || '',
        url: originalResource.telecom?.find(t => t.system === 'url')?.value || '',
        addressLine: originalResource.address?.[0]?.line?.[0] || '',
        city: originalResource.address?.[0]?.city || '',
        state: originalResource.address?.[0]?.state || 'CO',
        postalCode: originalResource.address?.[0]?.postalCode || '',
        country: originalResource.address?.[0]?.country || 'US'
      };

    } catch (err) {
      console.error('Error loading organization:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  });

  async function handleSubmit() {
    try {
      if (!originalResource) throw new Error('No original resource loaded');

      // Create updated resource by starting with original and carefully merging changes
      const updatedResource = {
        ...originalResource,
        name: formData.name,
        telecom: [
          // Preserve any telecom entries we don't handle in our form
          ...(originalResource.telecom || []).filter(t => 
            !['phone', 'fax', 'email', 'url'].includes(t.system)
          ),
          // Only add telecom entries that have values
          ...(formData.phone ? [{ system: 'phone', value: formData.phone, use: 'work' }] : []),
          ...(formData.fax ? [{ system: 'fax', value: formData.fax, use: 'work' }] : []),
          ...(formData.email ? [{ system: 'email', value: formData.email, use: 'work' }] : []),
          ...(formData.url ? [{ system: 'url', value: formData.url, use: 'work' }] : [])
        ],
        address: [
          {
            ...(originalResource.address?.[0] || {}), // Preserve any existing address fields
            line: [formData.addressLine].filter(Boolean), // Only include if there's a value
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country,
            use: 'work',
            type: 'both'
          },
          // Preserve any additional addresses beyond the first one
          ...(originalResource.address || []).slice(1)
        ]
      };

      const response = await fetch(`${base}/api/organization/update/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedResource)
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      // Update our original resource with the server response
      originalResource = await response.json();

      // Show success message
      feedbackType = 'success';
      feedbackMessage = 'Organization updated.';
      setTimeout(() => {
        feedbackMessage = null;
      }, 3000);

    } catch (err) {
      console.error('Error updating organization:', err);
      error = err.message;

      feedbackType = 'error';
      feedbackMessage = 'Failed to update organization.';
      setTimeout(() => {
        feedbackMessage = null;
      }, 3000);
    }
  }
</script>

{#if loading}
  <div class="loading">Loading organization data...</div>
{:else if error}
  <div class="error">{error}</div>
{:else}
  <div class="organization-form">
    <h2>{translateText('editOrganization')}</h2>

    <div class="form-group">
      <label for="name">{translateText('organizationName')} </label>
      <input 
        type="text" 
        id="name" 
        bind:value={formData.name} 
        placeholder="Enter organization name"
      />
    </div>

    <h3>{translateText('contactPoints')}</h3>
    
    <div class="form-group">
      <label for="phone">{translateText('phone')}</label>
      <input 
        type="tel" 
        id="phone" 
        bind:value={formData.phone}
        placeholder="Enter phone number"
      />
    </div>

    <div class="form-group">
      <label for="fax">{translateText('fax')}</label>
      <input 
        type="tel" 
        id="fax" 
        bind:value={formData.fax}
        placeholder="Enter fax number"
      />
    </div>

    <div class="form-group">
      <label for="email">Email</label>
      <input 
        type="email" 
        id="email" 
        bind:value={formData.email}
        placeholder="Enter email"
      />
    </div>

    <div class="form-group">
      <label for="url">{translateText('website')}</label>
      <input 
        type="url" 
        id="url" 
        bind:value={formData.url}
        placeholder="Enter website URL"
      />
    </div>

    <h3>Address</h3>

    <div class="form-group">
      <label for="addressLine">{translateText('streetAddress')} </label>
      <input 
        type="text" 
        id="addressLine" 
        bind:value={formData.addressLine}
        placeholder="Enter street address"
      />
    </div>

    <div class="form-group">
      <label for="city">{translateText('city')}</label>
      <input 
        type="text" 
        id="city" 
        bind:value={formData.city}
        placeholder="Enter city"
      />
    </div>

    <div class="form-group">
      <label for="state">{translateText('state')}</label>
      <input 
        type="text" 
        id="state" 
        bind:value={formData.state}
        placeholder="Enter state"
      />
    </div>

    <div class="form-group">
      <label for="postalCode">{translateText('postalCode')}</label>
      <input 
        type="text" 
        id="postalCode" 
        bind:value={formData.postalCode}
        placeholder="Enter postal code"
      />
    </div>

    <div class="form-group">
      <label for="country">{translateText('country')}</label>
      <input 
        type="text" 
        id="country" 
        bind:value={formData.country}
        placeholder="Enter country"
      />
    </div>

    <div class="form-actions">
      <div class="button-feedback-container">
        <button on:click={handleSubmit}>{translateText('saveChanges')}</button> 
        {#if feedbackMessage}
          <span 
            class="feedback-message {feedbackType}"
            transition:fade
          >
            {feedbackMessage}
          </span>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>

  
.button-feedback-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .feedback-message {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .feedback-message.success {
    color: #198754;
  }

  .feedback-message.error {
    color: #dc3545;
  }
  
  .organization-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  input {
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .form-actions {
    margin-top: 1rem;
  }

  button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: #0056b3;
  }

  .loading {
    text-align: center;
    padding: 20px;
  }

  .error {
    color: red;
    padding: 20px;
    text-align: center;
  }
</style>