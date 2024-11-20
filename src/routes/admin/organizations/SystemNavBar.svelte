<script>
  import { onMount } from 'svelte';
  import ChooseOrg from './ChooseOrg.svelte';
  import LoadData from './LoadData.svelte';
  import SystemStatus from './SystemStatus.svelte';
  import OrgNavBar from './oneOrg/OrgNavBar.svelte';
  import AddOrganization from './AddOrganization.svelte';
  import AssociateProviders from './AssociateProviders.svelte';
  import SetRoles from './SetUserRoles.svelte';
  import ExclusionAdmin from './ExclusionAdmin.svelte';
  import EventMonitor from './EventMonitor.svelte';
  
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  import { t } from '$lib/i18n';
  
  let activeView = 'orgs';
  let chosenOrg;
  let showChooseOrg = true;
  
  function setView(view) {
    console.log("Setting active view to:", view);
    activeView = view;
  }
  
  function handleOrgChosen(event) {
    chosenOrg = event.detail;
    console.log('Org chosen:', chosenOrg);
    showChooseOrg = false;
  }

  // Track unread event count
  let unreadEvents = 0;

  function handleEventUpdate(event) {
    if (activeView !== 'events') {
      unreadEvents++;
    }
  }

  // Reset unread count when viewing events
  $: if (activeView === 'events') {
    unreadEvents = 0;
  }

  onMount(() => {
    window.addEventListener('newEvent', handleEventUpdate);
    return () => {
      window.removeEventListener('newEvent', handleEventUpdate);
    };
  });
</script>

<!-- Navigation bar -->
<div class="navbar">
  <a 
    class={activeView === 'orgs' ? 'active' : ''} 
    on:click={() => setView('orgs')}
  >
    {t('orgs')}
  </a>
  <a 
    class={activeView === 'status' ? 'active' : ''} 
    on:click={() => setView('status')}
  >
    {t('status')}
  </a>
  <a 
    class={activeView === 'loadData' ? 'active' : ''} 
    on:click={() => setView('loadData')}
  >
    {t('loadData')}
  </a>
  <a 
    class={activeView === 'addOrg' ? 'active' : ''} 
    on:click={() => setView('addOrg')}
  >
    {t('addOrg')}
  </a>
  <a 
    class={activeView === 'associateProviders' ? 'active' : ''} 
    on:click={() => setView('associateProviders')}
  >
    {t('associateProviders')}
  </a>
  <a 
    class={activeView === 'setRoles' ? 'active' : ''} 
    on:click={() => setView('setRoles')}
  >
    {t('setRoles')}
  </a>
  <a 
    class={activeView === 'exclusion' ? 'active' : ''} 
    on:click={() => setView('exclusion')}
  >
    {t('exclusion')}
  </a>
  <a 
    class={activeView === 'events' ? 'active' : ''} 
    on:click={() => setView('events')}
  >
    <div class="event-nav-item">
      {t('events')}
      {#if unreadEvents > 0}
        <span class="event-badge">{unreadEvents}</span>
      {/if}
    </div>
  </a>
</div>

<!-- Conditional rendering for each view -->
{#if activeView === 'orgs'}
  {#if showChooseOrg}
    <ChooseOrg on:OrgChosen={handleOrgChosen} />
  {:else if chosenOrg}
    <OrgNavBar orgId={chosenOrg} />
  {/if}
{/if}

{#if activeView === 'status'}
  <SystemStatus />
{/if}

{#if activeView === 'loadData'}
  <LoadData />
{/if}

{#if activeView === 'addOrg'}
  <AddOrganization />
{/if}

{#if activeView === 'associateProviders'}
  <AssociateProviders />
{/if}

{#if activeView === 'setRoles'}
  <SetRoles />
{/if}

{#if activeView === 'exclusion'}
  <ExclusionAdmin />
{/if}

{#if activeView === 'events'}
  <EventMonitor />
{/if}

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

  .event-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .event-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: #ef4444;
    color: white;
    border-radius: 9999px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    min-width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>