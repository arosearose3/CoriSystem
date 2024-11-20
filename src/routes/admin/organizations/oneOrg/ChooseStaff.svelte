<!-- src/routes/admin/orgs2/ChooseStaff.svelte -->

<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { base } from '$app/paths';
    const dispatch = createEventDispatcher();
    import axios from 'axios';

    export let orgId = ''; // receive orgId from parent
  
    let staff = []; // To store fetched staff
    let selectedStaff;
    let isFetching = false;
    let generalError = null;
    let fetchFailed = false;
    let retryCount = 0;
    const maxRetries = 3;
  

    // Function to handle staff selection
    function handleStaffSelect(staffId) {
      selectedStaff = staffId;
      dispatch('StaffChosen', selectedStaff);
    }

    // Function to fetch staff from the API based on orgId
    async function fetchStaff() {
      if (retryCount >= maxRetries) return; // Stop fetching if max retries have been reached

      isFetching = true;
      try {
        const response = await axios.get(`${base}/api/practitioner/getStaffForOrg`, {
          params: {
            orgId,
          },
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/fhir+json',
          },
        });

        if (response.ok) {
          staff = await response.json();
          generalError = null;
          retryCount = 0; // Reset retry count on success
          fetchFailed = false; // Reset fetch failure flag
        } else {
          throw new Error('Failed to fetch staff');
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        generalError = 'Unable to retrieve staff. Please try again later.';
        retryCount++;
        fetchFailed = true; // Set failure flag to prevent further auto-fetching
      } finally {
        isFetching = false;
      }
    }

    // Fetch staff when the component is mounted
    onMount(() => {
      if (orgId) {
        fetchStaff();
      }
    });
</script>

<!-- Render the list of staff as buttons -->
{#if staff.length > 0}
  <div>
    {#each staff as staffer}
      <button on:click={() => handleStaffSelect(staffer.id)}>
        {staffer.familyname}
      </button>
    {/each}
  </div>
{:else if fetchFailed}
  <p class="error-message">{generalError}</p>
{:else}
  <p>No staff found. Try logging in.</p>
{/if}

<style>
  .error-message {
    color: red;
  }

  button {
    display: block;
    margin: 5px 0;
    padding: 10px;
    background-color: #007BFF;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  button:hover {
    background-color: #0056b3;
  }
</style>
