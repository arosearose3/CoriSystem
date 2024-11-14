<!-- EventTypes.svelte -->
<script>
  import { onMount } from 'svelte';
  import Timers from './Timers.svelte';
  import DataChanges from './DataChanges.svelte';
  import Webhooks from './Webhooks.svelte';

  let activeView = 'timers';

  function setView(view) {
    console.log("Setting active view to:", view);
    activeView = view;
  }
</script>

<div class="container mx-auto">
  <div class="navbar">
    <a 
      class={activeView === 'timers' ? 'active' : ''}
      on:click={() => setView('timers')}
    >
      Timers
    </a>
    <a 
      class={activeView === 'dataChanges' ? 'active' : ''}
      on:click={() => setView('dataChanges')}
    >
      Data Changes
    </a>
    <a 
      class={activeView === 'webhooks' ? 'active' : ''}
      on:click={() => setView('webhooks')}
    >
      Webhooks
    </a>
  </div>

  <div class="content-area">
    {#if activeView === 'timers'}
      <Timers />
    {:else if activeView === 'dataChanges'}
      <DataChanges />
     {:else if activeView === 'webhooks'}
      <Webhooks /> 
    {/if}
  </div>
</div>

<style>
  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .navbar {
    display: flex;
    justify-content: space-around;
    background-color: #333;
    padding: 1em;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
  }

  .navbar a {
    color: white;
    text-decoration: none;
    padding: 0.5em 1em;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s ease-in-out;
  }

  .navbar a:hover {
    background-color: #555;
  }

  .active {
    background-color: #007bff;
  }

  .content-area {
    padding: 1rem;
  }
</style>