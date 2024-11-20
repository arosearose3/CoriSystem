<script>
  import Referrals from './Referrals.svelte';
  import Consents from './Consents.svelte';
  import Info from './Info.svelte';

  let selectedTab = 'referrals';
  export let currentPatientId ;
  export let currentPractitionerId;
  
  function switchTab(tab) {
    selectedTab = tab;
  }
</script>

<div class="patients-dashboard">
  <!-- Navigation Bar -->
  <nav class="patients-nav">
    <ul>
      <li class:selected={selectedTab === 'info'} on:click={() => switchTab('info')}>Info</li>
      <li class:selected={selectedTab === 'referrals'} on:click={() => switchTab('referrals')}>Referrals</li>
      <li class:selected={selectedTab === 'consents'} on:click={() => switchTab('consents')}>Consents</li>
    </ul>
  </nav>

  <!-- Tab Content -->
  <main>
    {#if selectedTab === 'referrals'}
      <Referrals {currentPatientId} {currentPractitionerId} />
    {/if}
    {#if selectedTab === 'consents'}
      <Consents {currentPatientId} {currentPractitionerId} />
    {/if}
    {#if selectedTab === 'info'}
      <Info {currentPatientId} {currentPractitionerId} />
    {/if}
  </main>
</div>

<style>
  .patients-nav {
    display: flex;
    background-color: #f0f0f0;
    padding: 15px;
  }

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    gap: 15px;
  }

  li {
    cursor: pointer;
    padding: 10px 15px;
  }

  li.selected {
    background-color: #007bff;
    color: white;
    border-radius: 4px;
  }

  li:hover {
    background-color: #0056b3;
    color: white;
  }

  main {

  }
</style>
