<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores.js';
  import axios from 'axios';
  import { fade } from 'svelte/transition';
  import { base } from '$app/paths';
  import { currentLanguage, activeTranslations } from '$lib/i18n';

  $: currentTranslations = $activeTranslations;
  $: translateText = (key) => {
    console.log ("In translateText key:"+key);
    return currentTranslations[key] || key;
  };


  let state = {
    isLoading: true,
    isSaving: false,
    hasChanges: false,
    error: null,
    message: null
  };

  let formData = {
    smsEnabled: false,
    smsNumber: '',
    limitTexting: false,
    startTime: '09:00',
    endTime: '17:00',
    dateOfBirth: '',
    npi: ''
  };

  let originalData = { ...formData };
  let existingPractitionerData = null;

  let validation = {
    smsNumber: { isValid: true, message: '' },
    npi: { isValid: true, message: '' }
  };

  const NPI_REGEX = /^\d{10}$/;
  const PHONE_REGEX = /^\+?1?\d{10}$/;
  const BASE_URL = `${base}/api/practitioner`;
  const practitionerId = $user?.practitioner?.Pid;

  const timeOptions = [
    { value: '07:00:00', label: '7 am' },
    { value: '08:00:00', label: '8 am' },
    { value: '09:00:00', label: '9 am' },
    { value: '10:00:00', label: '10 am' },
    { value: '11:00:00', label: '11 am' },
    { value: '12:00:00', label: '12 pm' },
    { value: '13:00:00', label: '1 pm' },
    { value: '14:00:00', label: '2 pm' },
    { value: '15:00:00', label: '3 pm' },
    { value: '16:00:00', label: '4 pm' },
    { value: '17:00:00', label: '5 pm' },
    { value: '18:00:00', label: '6 pm' },
    { value: '19:00:00', label: '7 pm' },
    { value: '20:00:00', label: '8 pm' },
    { value: '21:00:00', label: '9 pm' }
  ];

  function validateSmsNumber(number) {
    if (!number) return { isValid: true, message: '' };
    const isValid = PHONE_REGEX.test(number.replace(/\D/g, ''));
    return {
      isValid,
      message: isValid ? '' : 'Please enter a valid 10-digit phone number'
    };
  }

  function validateNPI(npi) {
    if (!npi) return { isValid: true, message: '' };
    const isValid = NPI_REGEX.test(npi);
    return {
      isValid,
      message: isValid ? '' : 'NPI must be exactly 10 digits'
    };
  }

  // Add reactive statement to check form validity
  $: {
    validation.smsNumber = validateSmsNumber(formData.smsNumber);
    validation.npi = validateNPI(formData.npi);
  }

  $: isFormValid = validation.smsNumber.isValid && validation.npi.isValid;

  // Add reactive statement to check for changes
  $: {
  state.hasChanges =
    formData.smsEnabled !== originalData.smsEnabled ||
    formData.smsNumber !== originalData.smsNumber ||
    formData.limitTexting !== originalData.limitTexting ||
    formData.startTime !== originalData.startTime ||
    formData.endTime !== originalData.endTime ||
    formData.dateOfBirth !== originalData.dateOfBirth ||
    formData.npi !== originalData.npi;
}

  function formatPhoneNumber(input) {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return input;
  }

  async function loadPractitionerData() {
    try {
      state.isLoading = true;
      state.error = null;

      if (!practitionerId) {
        throw new Error('No practitioner ID found');
      }

      const response = await axios.get(`${BASE_URL}/${practitionerId}`);
      const data = response.data;
      existingPractitionerData = data;

      formData = {
        smsEnabled: data.extension?.some(e => 
          e.url === 'https://combinebh.org/cori-value-set-sms-enabled' && e.valueBoolean === true
        ) || false,
        smsNumber: data.telecom?.find(t => t.system === 'phone')?.value || '',
        limitTexting: data.extension?.some(e => 
          e.url === 'https://combinebh.org/cori-value-set-texting-limits' && e.valueBoolean === true
        ) || false,
        startTime: data.extension?.find(e => e.url === 'https://combinebh.org/cori-value-set-texting-start')?.valueTime || '09:00:00',
        endTime: data.extension?.find(e => e.url === 'https://combinebh.org/cori-value-set-texting-end')?.valueTime || '17:00:00',
        dateOfBirth: data.birthDate || '',
        npi: data.identifier?.find(id => id.system === 'http://hl7.org/fhir/sid/us-npi')?.value || ''
      };

      // Create a deep copy for comparison
      originalData = JSON.parse(JSON.stringify(formData));
      
    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to load practitioner data';
      console.error('Load error:', error);
    } finally {
      state.isLoading = false;
    }
  }

  function formatTime(time) {
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
      return time;
    }
    if (/^\d{2}:\d{2}$/.test(time)) {
      return `${time}:00`;
    }
    return time;
  }

  async function handleSave() {
    try {
      state.isSaving = true;
      state.error = null;

      if (!existingPractitionerData) {
        throw new Error('No existing practitioner data found');
      }

      const updatedPractitionerResource = {
        ...existingPractitionerData,
        identifier: formData.npi ? [
          {
            system: 'http://hl7.org/fhir/sid/us-npi',
            value: formData.npi
          }
        ] : existingPractitionerData.identifier || [],

        telecom: [
          ...existingPractitionerData.telecom?.filter(t => t.system !== 'phone') || [],
          ...(formData.smsEnabled && formData.smsNumber ? [{
            system: 'phone',
            value: formData.smsNumber,
            use: 'mobile'
          }] : [])
        ],

        birthDate: formData.dateOfBirth || existingPractitionerData.birthDate,
        extension: [
          {
            url: 'https://combinebh.org/cori-value-set-sms-enabled',
            valueBoolean: formData.smsEnabled
          },
          {
            url: 'https://combinebh.org/cori-value-set-texting-limits',
            valueBoolean: formData.limitTexting
          },
          {
            url: 'https://combinebh.org/cori-value-set-texting-start',
            valueTime: formatTime(formData.startTime)
          },
          {
            url: 'https://combinebh.org/cori-value-set-texting-end',
            valueTime: formatTime(formData.endTime)
          },
          ...((existingPractitionerData.extension && Array.isArray(existingPractitionerData.extension)) 
              ? existingPractitionerData.extension.filter(
                  ext => ![
                    'https://combinebh.org/cori-value-set-sms-enabled',
                    'https://combinebh.org/cori-value-set-texting-limits',
                    'https://combinebh.org/cori-value-set-texting-start',
                    'https://combinebh.org/cori-value-set-texting-end'
                  ].includes(ext.url)
                )
              : [])
        ]
      };

      await axios.put(`${BASE_URL}/update/${practitionerId}`, updatedPractitionerResource);

      user.update(store => ({
        ...store,
        practitioner: {
          ...store.practitioner,
          smsEnabled: formData.smsEnabled,
          smsNumber: formData.smsNumber,
          dateOfBirth: formData.dateOfBirth,
          npi: formData.npi
        }
      }));

      state.message = 'Settings saved successfully';
      originalData = JSON.parse(JSON.stringify(formData));
      state.hasChanges = false;

      setTimeout(() => {
        state.message = null;
      }, 3000);

    } catch (error) {
      state.error = error.response?.data?.message || 'Failed to save changes';
      console.error('Save error:', error);
    } finally {
      state.isSaving = false;
    }
  }

  $: buttonText = state.isSaving ? 
    `${translateText('saving')}...` : 
    translateText('saveChanges');

  onMount(loadPractitionerData);
</script>

<div class="provider-settings">
  {#if state.isLoading}
    <div class="loading">{translateText('loadingSettings')}...</div>
  {:else if state.error}
    <div class="error" transition:fade>
      {state.error}
      <button class="close-error" on:click={() => state.error = null}>×</button>
    </div>
  {:else}
    <h3>{translateText('providerSettings')}</h3>

    <form on:submit|preventDefault={handleSave}>
      <section class="preferences">
        <h4>{translateText('notificationPreferences')}</h4>

        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              bind:checked={formData.smsEnabled}
            >
            {translateText('enableTextMessages')}</label>

          {#if formData.smsEnabled}
            <div class="sms-settings" transition:fade>
              <input
                type="tel"
                placeholder="(555) 555-5555"
                bind:value={formData.smsNumber}
                class:invalid={!validation.smsNumber.isValid}
              />
              {#if !validation.smsNumber.isValid}
                <span class="validation-message">{validation.smsNumber.message}</span>
              {/if}

              <div class="time-limits">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    bind:checked={formData.limitTexting}
                  >
                  {translateText('limitTextingHours')}</label>

                {#if formData.limitTexting}
                  <div class="time-selectors" transition:fade>
                    <select
                      bind:value={formData.startTime}
                    >
                      {#each timeOptions as time}
                        <option value={time.value}>{time.label}</option>
                      {/each}
                    </select>
                    <span>to</span>
                    <select
                      bind:value={formData.endTime}
                    >
                      {#each timeOptions as time}
                        <option value={time.value}>{time.label}</option>
                      {/each}
                    </select>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </section>

      <section class="identity">
        <h4>{translateText('providerInformation')}</h4>
        
        <div class="form-group">
          <label for="dob">{translateText('dateOfBirth')}</label>
          <input
            type="date"
            id="dob"
            bind:value={formData.dateOfBirth}
          />
        </div>

        <div class="form-group">
          <label for="npi">{translateText('npiNumber')}</label>
          <input
            type="text"
            id="npi"
            bind:value={formData.npi}
            class:invalid={!validation.npi.isValid}
          />
          {#if !validation.npi.isValid}
            <span class="validation-message">{validation.npi.message}</span>
          {/if}
        </div>
      </section>

      <div class="form-actions">
        <button
          type="submit"
          class="save-button"
          disabled={!state.hasChanges}
        >
          {buttonText}
        </button>

        {#if state.message}
          <span class="success-message" transition:fade>{state.message}</span>
        {/if}
      </div>
    </form>
  {/if}
</div>

<style>
  .provider-settings {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  section {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid #eee;
    border-radius: 4px;
  }

  h3 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  h4 {
    margin-bottom: 1rem;
    color: #666;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  input[type="text"],
  input[type="tel"],
  input[type="date"],
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  input.invalid {
    border-color: #dc3545;
  }

  .validation-message {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .time-selectors {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .time-selectors select {
    width: auto;
  }

  .form-actions {
    margin-top: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .save-button {
    padding: 0.75rem 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .save-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .save-button:not(:disabled):hover {
    background-color: #0056b3;
  }

  .success-message {
    color: #28a745;
  }

  .error {
    background-color: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-error {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.5rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
</style>