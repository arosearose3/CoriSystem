<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { base } from '$app/paths';

  const dispatch = createEventDispatcher();

  let organizations = []; // To store fetched organizations
  let selectedOrg;
  let isFetching = false;
  let generalError = null;
  let fetchFailed = false;
  let retryCount = 0;
  const maxRetries = 3;
  let sortColumn = 'name';
  let sortDirection = 'asc';

  // Function to handle organization selection
  function handleOrgSelect(orgId) {
    selectedOrg = orgId;
    dispatch('OrgChosen', selectedOrg);
  }

  async function handleSendInvite(email, inviteCode, orgName) {
    const subject = 'Your Cori Organization Administrator Invite Code';
    const htmlContent = `Your Cori Organization Administrator Invite Code is ${inviteCode}<br><br>Watch https://www.loom.com/share/c898dc8ffaa74d93be5a1d0f283daa75`;

    try {
      const response = await fetch(`${base}/api/email/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          html: htmlContent
        })
      });

      if (!response.ok) throw new Error('Failed to send email');
      alert(`Invite email sent to ${orgName} successfully`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send invite email to ${orgName}`);
    }
  }

  async function handleDelete(organizationId) {
    const confirmDelete = confirm('Do you really want to delete this organization and all associated PractitionerRoles?');
    if (!confirmDelete) return;

    try {
      // Step 1: Fetch PractitionerRoles associated with the organization
      const rolesResponse = await fetch(`${base}/api/role/withOrganization?organizationId=${organizationId}`);
      if (!rolesResponse.ok) throw new Error('Failed to retrieve PractitionerRoles.');

        // Directly parse the response as an array of PractitionerRole objects
      const practitionerRoles = await rolesResponse.json();

      // Step 2: Delete all associated PractitionerRoles
      await Promise.all(
        practitionerRoles.map(async (role) => {
          const roleId = role.id;
          console.log ("chooseorg/deleting role ",roleId);
          await fetch(`${base}/api/role/delete?practitionerRoleId=${roleId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

        })
      );

      // Step 3: Delete the organization after all PractitionerRoles are deleted
      const orgResponse = await fetch(`${base}/api/organization/${organizationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (orgResponse.ok) {
        alert('Organization and associated PractitionerRoles deleted successfully.');
        organizations = organizations.filter(org => org.id !== organizationId); // Update the list of organizations
      } else {
        throw new Error('Failed to delete organization.');
      }
    } catch (error) {
      console.error('Error deleting organization and PractitionerRoles:', error);
      alert('An error occurred while trying to delete the organization and its associated PractitionerRoles.');
    }
  }

  // Function to fetch organizations from API
  async function fetchOrganizations() {
    if (retryCount >= maxRetries) return; // Stop fetching if max retries have been reached

    isFetching = true;
    try {
      const response = await fetch(`${base}/api/organization/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        organizations = await response.json();
        generalError = null;
        retryCount = 0; // Reset retry count on success
        fetchFailed = false; // Reset fetch failure flag
      } else {
        throw new Error('Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      generalError = 'Unable to retrieve organizations. Please try again later.';
      retryCount++;
      fetchFailed = true; // Set failure flag to prevent further auto-fetching
    } finally {
      isFetching = false;
    }
  }



  // Helper function to find the Admin invite code using org ID
  async function findInviteCode(orgId) {
    try {
      const response = await fetch(`${base}/api/invite/organization/${orgId}/inviteCode`);
      const data = await response.json();
      return data.code || 'No code found';
    } catch (error) {
      console.error('Error fetching invite code:', error);
      return 'No code found';
    }
  }

  // Sort function for name and email
  function sortTable(column) {
    if (sortColumn === column) {
      // Toggle sort direction if the same column is clicked
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc'; // Reset to ascending order on new column
    }

    organizations = organizations.sort((a, b) => {
      let aValue = a[column] || '';
      let bValue = b[column] || '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onMount(() => {
    fetchOrganizations();
  });
</script>

<!-- Render the table of organizations -->
{#if organizations.length > 0}
  <table>
    <thead>
      <tr>
        <th on:click={() => sortTable('name')}>
          Name
          {#if sortColumn === 'name'}
            <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
          {/if}
        </th>
        <th on:click={() => sortTable('email')}>
          Email
          {#if sortColumn === 'email'}
            <span class="sort-indicator" class:desc={sortDirection === 'desc'}></span>
          {/if}
        </th>
        <th>Invite Code</th>
        <th>Actions</th>
        <th>Delete</th>
      </tr>
    </thead>
    <tbody>
      {#each organizations as org}
        <tr>
          <td>
            <span class="org-name" on:click={() => handleOrgSelect(org.id)}>{org.name}</span>
          </td>
          <td>
            {#if org.telecom && org.telecom.some(t => t.system === 'email')}
              {org.telecom.find(t => t.system === 'email').value}
            {:else}
              No email
            {/if}
          </td>
          <td>

                  {#await findInviteCode(org.id) then inviteCode}
                    {inviteCode}
                  {/await}

          </td>
          <td>
            {#await findInviteCode(org.id) then inviteCode}
              {inviteCode}
              {#if org.telecom && org.telecom.some(t => t.system === 'email')}
                <button on:click={() => handleSendInvite(
                  org.telecom.find(t => t.system === 'email').value, 
                  inviteCode,
                  org.name
                )}>
                  Send Invite
                </button>
              {/if}
            {/await}
          </td>
          <td>
            <span class="delete-icon" on:click={() => handleDelete(org.id)}>🗑️</span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else if fetchFailed}
  <p class="error-message">{generalError}</p>
{:else}
  <p>No organizations found. Try logging in.</p>
{/if}

<style>
  .org-name {
    cursor: pointer;
    transition: font-weight 0.3s ease;
  }

  .org-name:hover {
    font-weight: bold;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
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

  .sort-indicator::after {
    content: ' ↑';
    opacity: 0.5;
  }

  .sort-indicator.desc::after {
    content: ' ↓';
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

  .delete-icon {
    cursor: pointer;
    color: red;
    font-size: 16px;
  }

  .error-message {
    color: red;
  }
</style>
