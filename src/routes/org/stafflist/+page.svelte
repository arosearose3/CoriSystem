<script>
  import StaffList from './StaffList3.svelte';
  import AddStaff from './AddOneStaff.svelte';
  import UploadRoster from './UploadRoster.svelte';
  import Exclusion from './Exclusion.svelte';
  import { user } from '$lib/stores.js';
  import { practitionersHelper } from '$lib/practitionersStore.js';

  let activeView = 'staff';
  const organizationId = $user?.practitioner?.organizationId;

  $: if (organizationId) {
      practitionersHelper.setOrganizationId(organizationId);
  }

  function setView(view) {
      activeView = view;
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- Navigation bar -->
  <nav class="bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4">
          <div class="flex justify-between h-16">
              <div class="flex justify-between flex-1">
                  <!-- Navigation Links -->
                  <div class="flex space-x-4">
                      <button
                          class={`px-4 py-2 text-sm font-medium rounded-md ${
                              activeView === 'staff'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                          on:click={() => setView('staff')}
                      >
                          Staff
                      </button>

                      <button
                          class={`px-4 py-2 text-sm font-medium rounded-md ${
                              activeView === 'add'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                          on:click={() => setView('add')}
                      >
                          Add
                      </button>

                      <button
                          class={`px-4 py-2 text-sm font-medium rounded-md ${
                              activeView === 'import'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                          on:click={() => setView('import')}
                      >
                          Manage Roster
                      </button>

                      <button
                          class={`px-4 py-2 text-sm font-medium rounded-md ${
                              activeView === 'exclusion'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                          on:click={() => setView('exclusion')}
                      >
                          Exclusion
                      </button>
                  </div>
              </div>
          </div>
      </div>
  </nav>

  <!-- Main Content with Card Style -->
  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="bg-white shadow-lg rounded-lg overflow-hidden">
          {#if activeView === 'staff'}
              <div class="p-6">
                  <StaffList {organizationId} />
              </div>
          {:else if activeView === 'add'}
              <div class="p-6">
                  <AddStaff />
              </div>
          {:else if activeView === 'import'}
              <div class="p-6">
                  <UploadRoster />
              </div>
          {:else if activeView === 'exclusion'}
              <div class="p-6">
                  <Exclusion {organizationId}/>
              </div>
          {/if}
      </div>
  </main>
</div>

<style>
  /* Remove default button styles */
  button {
      border: none;
      outline: none;
      transition: all 0.2s ease-in-out;
  }

  /* Add smooth transitions */
  .bg-blue-600 {
      transition: background-color 0.2s ease-in-out;
  }

  /* Optional: Add some custom hover effects */
  button:hover {
      transform: translateY(-1px);
  }

  button:active {
      transform: translateY(0);
  }
</style>