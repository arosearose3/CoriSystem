<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { base } from '$app/paths';
  import Pick4 from './Pick4.svelte';
  import Availability from './Availability.svelte';
  import RecordButton from '../staff/orgadmin/RecordButton.svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let currentPractitionerRoleId;

  // Component state
  let capacityData = null;
  let availabilityData = null;
  let practitionerName = '';
  let organizationName = '';
  let updateMessage = '';
  let errorMessage = '';
  let practitionerRole = null;
  let isDataReady = false;
  let availabilityKey = 0;

  // Fetch data when component mounts or ID changes
  $: if (currentPractitionerRoleId && !isDataReady) {
    console.log('Fetching PractitionerRole data for ID:', currentPractitionerRoleId);
    fetchPractitionerRole(currentPractitionerRoleId);
  }

  onMount(() => {
    console.log('Component mounted with PractitionerRole ID:', currentPractitionerRoleId);
  });

  async function fetchPractitionerDetails(practitionerRoleId) {
    try {
      const response = await fetch(`${base}/api/role/getOrgAndPract?PRid=${practitionerRoleId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      practitionerName = data.practitionerName || 'Unknown Practitioner';
      organizationName = data.organizationName || 'Unknown Organization';
    } catch (error) {
      console.error('Error fetching practitioner details:', error);
      errorMessage = `Error fetching practitioner details: ${error.message}`;
    }
  }

  async function fetchPractitionerRole(practitionerRoleId) {
    console.log('Fetching PractitionerRole, ID:', practitionerRoleId);
    
    try {
      const response = await fetch(`${base}/api/role/getOne?id=${practitionerRoleId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Fetched PractitionerRole data:', data);

      if (data.resourceType === 'PractitionerRole' || (data.resourceType === 'Bundle' && data.entry && data.entry.length > 0)) {
        practitionerRole = data.resourceType === 'PractitionerRole' ? data : data.entry[0].resource;
        
        capacityData = practitionerRole.extension?.find(
          (ext) => ext.url === 'https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html'
        )?.extension || [];
        
        availabilityData = practitionerRole.availableTime || [];
        
        await fetchPractitionerDetails(practitionerRoleId);
        isDataReady = true;

        // Notify parent of initial data
        dispatch('dataLoaded', {
          capacity: capacityData,
          availability: availabilityData
        });
      } else {
        throw new Error('Invalid PractitionerRole data structure');
      }
    } catch (error) {
      console.error('Error fetching PractitionerRole:', error);
      errorMessage = `Error fetching PractitionerRole: ${error.message}`;
    }
  }

  async function handleSubmit() {
    if (!practitionerRole) {
      errorMessage = 'No PractitionerRole data available.';
      return;
    }

    try {
      if (!practitionerRole.resourceType) {
        practitionerRole.resourceType = 'PractitionerRole';
      }

      let capacity = null;
      if (capacityData && capacityData.length > 0) {
        capacity = {
          url: 'https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html',
          extension: capacityData,
        };
      }

      const response = await fetch(`${base}/api/role/patchCapacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practitionerRole,
          capacity,
        }),
      });

      if (!response.ok) throw new Error('Failed to update the capacity.');

      const data = await response.json();
      updateMessage = 'Successfully updated capacity';
      console.log('Successfully updated capacity:', data);

      // Notify parent of capacity update
      dispatch('capacityUpdate', { capacity: capacityData });

      // Handle patching availability
      if (availabilityData && availabilityData.length > 0) {
        const availabilityResponse = await fetch(`${base}/api/role/patchAvailability`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            practitionerRole,
            availableTime: availabilityData,
          }),
        });

        if (!availabilityResponse.ok) throw new Error('Failed to update the availability.');

        const availabilityDataResponse = await availabilityResponse.json();
        updateMessage += ' and availability';
        console.log('Successfully updated availability:', availabilityDataResponse);

        // Notify parent of availability update
        dispatch('availabilityUpdate', { availability: availabilityData });
      }

      // Notify parent of successful update
      dispatch('updateComplete', {
        capacity: capacityData,
        availability: availabilityData
      });

    } catch (error) {
      console.error('Error updating data:', error);
      errorMessage = `Error updating data: ${error.message}`;
      dispatch('updateError', { error: error.message });
    }
  }

  function handleCapacityChange(event) {
    const { capacityExtension } = event.detail;
    capacityData = capacityExtension[0].extension;
    dispatch('capacityChange', { capacity: capacityData });
  }

  function handleAvailabilityUpdate(event) {
    availabilityData = event.detail;
    dispatch('availabilityChange', { availability: availabilityData });
  }

  function handleAvailabilityProcessed(event) {
    const newAvailabilityData = event.detail.structuredAvailability;
    
    const newAvailableTimeArray = newAvailabilityData.availableTime;

    if (Array.isArray(newAvailableTimeArray) && 
        JSON.stringify(newAvailableTimeArray) !== JSON.stringify(availabilityData)) {
      availabilityData = [...newAvailableTimeArray];
      availabilityKey += 1;
      dispatch('availabilityChange', { availability: availabilityData });
    }
  }

  $: availabilityComponent = {
    key: availabilityKey,
    data: availabilityData
  };
</script>

<div>
  <h3>Capacity and Availability for {practitionerName}</h3>
  {#if organizationName}
    <p>Organization: {organizationName}</p>
  {/if}
  
  <button on:click={handleSubmit}>Submit</button>
  {#if updateMessage}
    <p class="success-message">{updateMessage}</p>
  {/if}

  {#if isDataReady}
    <Pick4 
      on:capacitychange={handleCapacityChange} 
      capacity={capacityData} 
    />
    <br>

    {#key availabilityComponent.key}
      <Availability 
        initialAvailability={availabilityComponent.data} 
        on:availabilityUpdate={handleAvailabilityUpdate} 
      />
    {/key}
  {:else}
    <p>Loading...</p>
  {/if}

  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
</div>

<style>
  h3 {
    font-size: 1.5em;
    color: #333;
    margin-bottom: 1rem;
  }

  button {
    padding: 10px 20px;
    margin: 10px 0;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  button:hover {
    background-color: #45a049;
  }

  .success-message {
    color: #4CAF50;
    padding: 10px;
    margin: 10px 0;
    background-color: #e8f5e9;
    border-radius: 4px;
  }

  .error-message {
    color: #dc3545;
    padding: 10px;
    margin: 10px 0;
    background-color: #fbeaea;
    border-radius: 4px;
  }
</style>