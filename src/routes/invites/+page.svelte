<!-- InviteCodeManager.svelte -->
<script>
    import { onMount } from 'svelte';


    import Trash2  from 'lucide-svelte/icons/trash-2';
    import ChevronDown  from 'lucide-svelte/icons/chevron-down';
    import ChevronUp  from 'lucide-svelte/icons/chevron-up';
    
    let activeTab = 'Users';
    let userCodes = [];
    let adminCodes = [];
    let newOrgCodes = [];
    let loading = true;
    let expandedRow = null;
    let userDetails = {};
    
    const tabs = ['Users', 'Admins', 'New Orgs'];
    
    async function loadData() {
      try {
        loading = true;
        const [users, admins, newOrgs] = await Promise.all([
          fetch('/api/invite/userCodes').then(r => r.json()),
          fetch('/api/invite/userAdminCodes').then(r => r.json()),
          fetch('/api/invite/userNewOrgCodes').then(r => r.json())
        ]);
        
        userCodes = users;
        adminCodes = admins;
        newOrgCodes = newOrgs;
      } catch (error) {
        console.error('Failed to load invite codes:', error);
      } finally {
        loading = false;
      }
    }
    
    async function deleteCode(code, type) {
      try {
        const response = await fetch(`/api/invite/inviteCodes/${code}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          switch (type) {
            case 'user':
              userCodes = userCodes.filter(c => c.code !== code);
              break;
            case 'admin':
              adminCodes = adminCodes.filter(c => c.code !== code);
              break;
            case 'neworg':
              newOrgCodes = newOrgCodes.filter(c => c.code !== code);
              break;
          }
        }
      } catch (error) {
        console.error('Failed to delete code:', error);
      }
    }
  
    async function fetchUserDetails(practitionerId) {
  try {
    // Fetch practitioner details
    const practitionerResponse = await fetch(`/api/practitioner/${practitionerId}`);
    const practitioner = await practitionerResponse.json();

    // Format the name from the given and family components
    const name = practitioner.name?.[0];
    const formattedName = name ? 
      `${name.given?.[0] || ''} ${name.family || ''}`.trim() : 
      'Unknown Name';

    // Fetch practitioner roles using the new endpoint
    const rolesResponse = await fetch(`/api/role/PractitionerRole?practitioner=${encodeURIComponent(practitionerId)}`);
    const rolesBundle = await rolesResponse.json();

    // Check if we have any roles (entries in the bundle)
    const roles = rolesBundle.entry || [];
    
    // Only fetch org names if we have roles
    const orgNames = roles.length > 0 ? 
      await Promise.all(
        roles.map(async entry => {
          const role = entry.resource;
          if (role.organization?.reference) {
            const orgResponse = await fetch(`/api/organization/getOrgName?reference=${encodeURIComponent(role.organization.reference)}`);
            const orgName = await orgResponse.text(); // Use text() since the response is a simple string
            return orgName || 'Unknown Organization';
          }
          return 'Unknown Organization';
        })
      ) : [];


      console.log('All organization names:', orgNames); // Debug log
      
    return {
      name: formattedName,
      npi: practitioner.identifier?.[0]?.value || 'No NPI',
      birthDate: practitioner.birthDate || 'Not provided',
      roles: roles.length > 0 ? 
        roles.map((entry, index) => ({
          ...entry.resource,
          organizationName: orgNames[index]
        })) : []
    };
  } catch (error) {
    console.error('Failed to fetch user details:', error);
    return null;
  }
}
  
    async function toggleUserDetails(code, practitionerId) {
      if (expandedRow === code) {
        expandedRow = null;
        return;
      }
  
      expandedRow = code;
      if (!userDetails[practitionerId]) {
        const details = await fetchUserDetails(practitionerId);
        userDetails = { ...userDetails, [practitionerId]: details };
      }
    }
    
    onMount(loadData);
  </script>
  
  <div class="container mx-auto p-4">
    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 mb-4">
      <nav class="flex space-x-4" aria-label="Tabs">
        {#each tabs as tab}
          <button
            class="px-4 py-2 text-sm font-medium {activeTab === tab ? 
              'border-b-2 border-blue-500 text-blue-600' : 
              'text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            on:click={() => activeTab = tab}
          >
            {tab}
          </button>
        {/each}
      </nav>
    </div>
  
    <!-- Content Area -->
    {#if loading}
      <div class="flex justify-center items-center h-32">
        <div class="text-gray-500">Loading...</div>
      </div>
    {:else}
      <!-- Users Table -->
      {#if activeTab === 'Users'}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-8 px-6 py-3"></th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invite Code
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Practitioner ID
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each userCodes as { code, practitionerId }}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <button 
                      class="text-gray-500 hover:text-gray-700"
                      on:click={() => toggleUserDetails(code, practitionerId)}
                    >
                      {#if expandedRow === code}
                        <ChevronUp size={18} />
                      {:else}
                        <ChevronDown size={18} />
                      {/if}
                    </button>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap font-mono">{code}</td>
                  <td class="px-6 py-4 whitespace-nowrap font-mono">{practitionerId}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button
                      class="text-red-600 hover:text-red-900"
                      on:click={() => deleteCode(code, 'user')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
                {#if expandedRow === code}
                  <tr>
                    <td colspan="4" class="px-6 py-4 bg-gray-50">
                        {#if userDetails[practitionerId]}
                          <div class="space-y-2">
                            <div class="mb-4">
                              <h3 class="font-semibold text-lg">{userDetails[practitionerId].name}</h3>
                              <p class="text-sm text-gray-600">NPI: {userDetails[practitionerId].npi}</p>
                              <p class="text-sm text-gray-600">Birth Date: {userDetails[practitionerId].birthDate}</p>
                            </div>
                            {#if userDetails[practitionerId].roles.length > 0}
                              <div class="space-y-4">
                                {#each userDetails[practitionerId].roles as role}
                                  <div class="pl-4 border-l-2 border-blue-500">
                                    <p class="text-sm text-gray-600">Organization: {role.organizationName}</p>
                                    {#if role.specialty}
                                      <p class="text-sm text-gray-600">
                                        Specialty: {role.specialty[0]?.coding[0]?.display || 'Not specified'}
                                      </p>
                                    {/if}
                                    {#if role.period?.start}
                                      <p class="text-sm text-gray-600">
                                        Start Date: {new Date(role.period.start).toLocaleDateString()}
                                      </p>
                                    {/if}
                                  </div>
                                {/each}
                              </div>
                            {:else}
                              <p class="text-sm text-gray-600 italic">No associated roles found</p>
                            {/if}
                          </div>
                        {:else}
                          <div class="text-gray-500">Loading user details...</div>
                        {/if}
                      </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
  
      <!-- Admins Table -->
      {#if activeTab === 'Admins'}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invite Code
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization ID
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each adminCodes as { code, OrganizationId }}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap font-mono">{code}</td>
                  <td class="px-6 py-4 whitespace-nowrap font-mono">{OrganizationId}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button
                      class="text-red-600 hover:text-red-900"
                      on:click={() => deleteCode(code, 'admin')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
  
      <!-- New Orgs Table -->
      {#if activeTab === 'New Orgs'}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invite Code
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each newOrgCodes as { code }}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap font-mono">{code}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button
                      class="text-red-600 hover:text-red-900"
                      on:click={() => deleteCode(code, 'neworg')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </div>