<script>
  import ChooseStaff from './ChooseStaff.svelte';
  import SingleStaffInfo from './SingleStaffInfo.svelte'; // assuming this displays staff details
  import OrgSettings from './OrgSettings.svelte';
  import StaffList3 from '../../../org/stafflist/StaffList3.svelte';

  export let orgId;
 

  let activeView = 'Staff List'; // Default view
  let chosenStaffId = null;

  function handleStaffChosen(event) {
    chosenStaffId = event.detail; // Store the selected staff's ID
  }

  function setView(viewName) {
    activeView = viewName;
  }
</script>

<!-- Navigation bar -->
<div class="navbar">
  <a class={activeView === 'Staff List' ? 'active' : ''} on:click={() => setView('Staff List')}>Staff List</a>
  <a class={activeView === 'Settings' ? 'active' : ''} on:click={() => setView('Settings')}>Settings</a>
</div>

<!-- Conditional rendering based on active view -->
{#if activeView === 'Staff List'}
  {#if chosenStaffId}
    <SingleStaffInfo staffId={chosenStaffId} />
  {:else}<hr>
  -- chosen org id {orgId}--<hr>
 <!--    <ChooseStaff orgId={orgId} on:StaffChosen={handleStaffChosen} /> -->
     <StaffList3 organizationId={orgId} on:StaffChosen={handleStaffChosen} />
  {/if}
{/if}

{#if activeView === 'Settings'}
  <OrgSettings />
{/if}

<!-- Styling -->
<style>
  .navbar {
    display: flex;
    justify-content: space-around;
    background-color: #333;
    padding: 1em;
  }

  .navbar a {
    color: white;
    text-decoration: none;
    padding: 0.5em 1em;
    cursor: pointer;
  }

  .navbar a:hover {
    background-color: #555;
  }

  .active {
    background-color: #007bff;
  }
</style>
