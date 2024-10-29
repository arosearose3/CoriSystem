<script>
  import StaffList from './StaffList3.svelte'; // Assuming you have a StaffList component
  import AddStaff from './AddOneStaff.svelte'; // Assuming you have an AddStaff component
  import ImportStaff from './ImportRoster.svelte'; // Assuming you have an ImportStaff component
  import Exclusion from './Exclusion.svelte'; // Import the new ExclusionCheck component
  import { user } from '$lib/stores.js'; // Assuming organizationId is stored in stores.js

  let activeView = 'staff'; // Default view is StaffList

  const organizationId = $user?.practitioner?.organizationId;

  function setView(view) {
    activeView = view;
  }
</script>

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
.content {
  padding: 1em;
}
</style>

<div>
<!-- Navigation bar for switching views -->
<div class="navbar">
  <a class={activeView === 'staff' ? 'active' : ''} on:click={() => setView('staff')}>Staff</a>
<!--   <a class={activeView === 'add' ? 'active' : ''} on:click={() => setView('add')}>Add</a>
  <a class={activeView === 'import' ? 'active' : ''} on:click={() => setView('import')}>Import</a> -->
  <a class={activeView === 'exclusion' ? 'active' : ''} on:click={() => setView('exclusion')}>Exclusion</a>
</div>

<!-- Content changes based on activeView -->
<div class="content">
  {#if activeView === 'staff'}
    <StaffList {organizationId} />
<!--   {:else if activeView === 'add'}
    <AddStaff />
  {:else if activeView === 'import'}
    <ImportStaff /> -->
  {:else if activeView === 'exclusion'}
    <Exclusion {organizationId}/>
  {/if}
</div>
</div>
