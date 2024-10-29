<script>
    import { onMount } from 'svelte';
    import { user } from '$lib/stores.js'; // Assuming organizationId is stored in stores.js
    import { base } from '$app/paths'; // Import base path
    import EditOneStaff from './EditOneStaff.svelte';
  
    let sortColumn = 'name';
    let sortDirection = 'asc';
    let message = '';
    let loadingPractitioners = true;
  
    let practitioners = [];
    let errorMessage = '';

    export let organizationId =''; //receive orgId from parent. 

    let selectedPractitioner = null;
  
    // Access the organizationId from the practitioner object in the user store
    //$: organizationId = $user?.practitioner?.organizationId;
  
    // Fetch practitioner roles by organization on component mount
    onMount(async () => {
      if (organizationId){
      try {
        await loadPractitioners();
        loadingPractitioners = false;
      } catch (error) {
        console.error('Error loading practitioners:', error);
        message = 'An unexpected error occurred while loading practitioners.';
      }
    } else {console.error('No org Id in StaffList3:');}
    });
  
    /**
     * Fetches PractitionerRole resources for the organization and processes them.
     */
    async function loadPractitioners() {
      try {
        if (!organizationId) {
          throw new Error('Organization ID is not available');
        }
  
        const response = await fetch(`${base}/api/role/withOrganization?organizationId=${organizationId}`);
        // this endpoint returns an array of PractitionerRole objects 
    
        if (true) {
         // const practitionerRoles = data.entry.map(entry => entry.resource);
         const practitionerRoles = await response.json();

         if (!Array.isArray(practitionerRoles)) {
            throw new Error('Invalid data format: expected an array of PractitionerRole resources');
          }

  
          // Initialize a new array to store the combined data
          const loadedPractitioners = [];
  
          // Fetch practitioner details in parallel
          await Promise.all(practitionerRoles.map(async (role) => {
            const practitionerId = role.practitioner?.reference?.split('/')[1]; // Extract Practitioner ID
            const practitionerRoleId = role.id; // Extract PractitionerRole ID
            if (!practitionerId) return;
  
            const practitionerData = await fetchPractitionerDetails(practitionerId);
  
            // Extract role names and create a comma-separated string
            const roleNames = (practitionerRoles || []) // Ensure practitionerRoles is defined
                .filter(r => r.practitioner?.reference?.split('/')[1] === practitionerId) // Filter by practitioner ID
                .flatMap(r => r.code || []) // Safely access 'code' or default to an empty array
                .flatMap(c => c.coding || []) // Safely access 'coding' or default to an empty array
                .filter(coding => coding.system === 'https://combinebh.org/cori-value-set/') // Filter by the specific system
                .map(coding => coding.code || 'Unknown Role') // Extract the code or fallback to 'Unknown Role'
                .join(', ') || 'No Roles'; // Join into a comma-separated string, fallback to 'No Roles' if empty

  
            // Combine all relevant data into a single object
            loadedPractitioners.push({
              lastUpdate: formatLastUpdate(role.meta.lastUpdate),
              id: practitionerId, // Practitioner ID
              roleId: practitionerRoleId, // PractitionerRole ID
              name: practitionerData.name,
              birthDate: practitionerData.birthDate,
              npi: practitionerData.npi,
              sms: practitionerData.sms,
              email: practitionerData.email, // Add email field
              inviteCode: practitionerData.inviteCode,
              roles: roleNames // Add the roles as a comma-separated string
            });
          }));
  
          // Assign the newly loaded practitioners to the reactive variable
          practitioners = loadedPractitioners;
        } else {
          message = 'Invalid FHIR PractitionerRole bundle format.';
        }
      } catch (error) {
        console.error('Error fetching practitioners:', error);
        message = 'Failed to fetch practitioners. Please try again.';
      }
    }
  
    /**
     * Fetches details of a practitioner by their ID.
     * @param {string} practitionerId - The ID of the practitioner.
     * @returns {Object} - An object containing the practitioner's name, birthDate, NPI, SMS, and email.
     */
    async function fetchPractitionerDetails(practitionerId) {
      try {
        const response = await fetch(`${base}/api/practitioner/${practitionerId}`);
        const practitioner = await response.json(); // Directly get the practitioner resource
  
        // Construct the full name
        const givenNames = practitioner.name?.[0]?.given?.join(' ') || '';
        const familyName = practitioner.name?.[0]?.family || 'Unknown';
        const fullName = `${givenNames} ${familyName}`.trim();
  
        // Extract NPI from identifier array
        const npiIdentifier = practitioner.identifier?.find(id => id.system === 'http://hl7.org/fhir/sid/us-npi');
        const npi = npiIdentifier ? npiIdentifier.value : 'Unknown';
  
        // Extract SMS (phone number) from telecom array
        const phoneTelecom = practitioner.telecom?.find(t => t.system === 'phone');
        const sms = phoneTelecom ? phoneTelecom.value : 'Unknown';
  
        // Extract email from telecom array
        const emailTelecom = practitioner.telecom?.find(t => t.system === 'email');
        const email = emailTelecom ? emailTelecom.value : 'Unknown';
     
        // if the Practitioner has no email, no account estableshed yet,fetch the invite code
        var inviteCode = 'Unknown';
        console.log ("stafflist3 fullname:",fullName," email:",email );
        if (email === 'Unknown') {
           inviteCode = await fetchInviteCode (practitionerId);
        } else {
           inviteCode = 'Invited';
        }
       

        return {
        
          name: fullName,
          birthDate: practitioner.birthDate || 'Unknown',
          npi,
          sms,
          email,
          inviteCode
        };
      } catch (error) {
        console.error(`Error fetching practitioner details for ID ${practitionerId}:`, error);
        return { name: 'Unknown', birthDate: 'Unknown', npi: 'Unknown', sms: 'Unknown', email: 'Unknown' };
      }
    }
  
    async function fetchInviteCode(pId) {
    try {
      const response = await fetch(`${base}/api/practitioner/getCodeByPractitionerId?practitionerId=${pId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if code is in the response
      if (data.code) {
        return data.code;
      } else {
        throw new Error('Invite code not found in response');
      }
    } catch (error) {
      console.error('Error fetching invite code:', error);
      return "No code found";
    }
  }

    /**
     * Dummy handler for deleting a practitioner.
     * @param {string} practitionerId - The ID of the practitioner to delete.
     * @param {string} practitionerRoleId - The ID of the practitioner role to delete.
     */
     async function handleDelete(practitionerId, practitionerRoleId) {
        // Ask for confirmation
        const confirmDelete = confirm("Do you really want to remove this provider from your roster?");
        
        if (!confirmDelete) {
            // User canceled, exit the function
            return;
        }

        try {
            // Send the delete request to the backend using the practitionerRoleId
            const response = await fetch(`${base}/api/role/delete?practitionerRoleId=${practitionerRoleId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            });

            // Check if the response was successful (status code 200 or 204)
            if (response.ok) {
            alert('Provider successfully removed from your roster.');
            
            // Optionally, you can refresh the list of practitioners after deletion
            await loadPractitioners(); // Reload the practitioners list
            practitioners = [...practitioners];
            } else {
            // Handle non-OK responses (e.g., 400, 500)
            const errorData = await response.json();
            alert(`Failed to remove provider: ${errorData.error || 'Unknown error occurred.'}`);
            }
        } catch (error) {
            // Handle network or server errors
            console.error('Error deleting PractitionerRole:', error);
            alert('An error occurred while trying to remove the provider. Please try again.');
        }
    }

  
    /**
     * Sorts the practitioners array based on the specified column.
     * @param {string} column - The column to sort by.
     */
     function sortTable(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }

  practitioners = practitioners.sort((a, b) => {
    // Handle null/undefined values
    let aValue = a[column] ?? '';
    let bValue = b[column] ?? '';

    // Special handling for specific columns
    if (column === 'name' || column === 'roles' || column === 'email' || column === 'sms' || column === 'npi') {
      // Convert to lowercase strings and handle 'Unknown'
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      // Put 'unknown' values at the end
      if (aValue === 'unknown' && bValue !== 'unknown') return 1;
      if (bValue === 'unknown' && aValue !== 'unknown') return -1;
    } else if (column === 'birthDate') {
      // Convert to dates, handle invalid dates
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
      
      // Handle invalid dates
      if (isNaN(aValue)) aValue = new Date(0);
      if (isNaN(bValue)) bValue = new Date(0);
    } else {
      // For any other columns, try numeric conversion
      aValue = !isNaN(aValue) ? Number(aValue) : aValue;
      bValue = !isNaN(bValue) ? Number(bValue) : bValue;
    }

    // Perform the comparison
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}
    function showEdit(practitioner) {
        selectedPractitioner = practitioner;
    }

    function handlePractitionerClick(practitioner) {
    selectedPractitioner = practitioner;
  }

  function handleEditComplete(event) {
        // Only reload practitioners if the edit was successful
        if (event.detail?.success) {
            loadPractitioners();
        }
        selectedPractitioner = null;
    }

    function formatLastUpdate(timestamp) {
    const date = new Date(timestamp);
  
    // Get month names in three-letter format
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
  
    // Get hours and format as 12-hour clock
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12 for midnight
  
    // Get minutes and remove leading zero
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    // Return formatted string
    return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
    }

  </script>
  
  <style>
      .sort-indicator::after {
    content: ' ↑';
    opacity: 0.5;
  }

  .sort-indicator.desc::after {
    content: ' ↓';
  }
    .practitioner-name {
        cursor: pointer;
        transition: font-weight 0.3s ease;
    }

    .practitioner-name:hover {
        font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
  
    th,
    td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      vertical-align: top;
    }
  
    th {
      cursor: pointer;
      background-color: #f2f2f2;
      user-select: none;
    }
  
    th:hover {
      background-color: #ddd;
    }
  
    .delete-icon {
      cursor: pointer;
      color: red;
      font-size: 16px;
    }
  </style>
 
{#if selectedPractitioner}
  <EditOneStaff 
    practitioner={selectedPractitioner}
    practitionerRoleId={selectedPractitioner.roleId}
    on:close={handleEditComplete}
  />
{:else}
  <span>
    {#if loadingPractitioners}Loading Practitioner Data...{/if}
  </span>

  <!-- Table UI -->
  {#if practitioners.length > 0}
    <table>
        <thead>
            <tr>
              <th on:click={() => sortTable('name')}>
                Name
                {#if sortColumn === 'name'}
                  <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
                {/if}
              </th>
              <th on:click={() => sortTable('birthDate')}>
                Date of Birth
                {#if sortColumn === 'birthDate'}
                  <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
                {/if}
              </th>
              <th on:click={() => sortTable('npi')}>
                NPI
                {#if sortColumn === 'npi'}
                  <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
                {/if}
              </th>
              <th on:click={() => sortTable('sms')}>
                Text Phone
                {#if sortColumn === 'sms'}
                  <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
                {/if}
              </th>
              <th on:click={() => sortTable('email')}>
                Email
                {#if sortColumn === 'email'}
                  <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
                {/if}
              </th>
              <th on:click={() => sortTable('roles')}>
                Roles
                {#if sortColumn === 'roles'}
                  <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
                {/if}
          <!--     </th>
              <th> Invite Code</th> -->
              <th>Remove</th>
            </tr>
          </thead>
        
      <tbody>
        {#each practitioners as practitioner}
          <tr>
            <td>
              <span 
                class="practitioner-name" 
                on:click={() => handlePractitionerClick(practitioner)}
              >
                {practitioner.name}
              </span>
            </td>
            <td>{practitioner.birthDate}</td>
            <td>{practitioner.npi}</td>
            <td>{practitioner.sms}</td>
            <td>{practitioner.email}</td>
            <td>{practitioner.roles}</td>
  <!--           <td>{practitioner.inviteCode}</td> -->
            <td>
              <span class="delete-icon" on:click={() => handleDelete(practitioner.id, practitioner.roleId)}>
                🗑️
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="message">{message || ''}</p>
  {/if}
{/if}