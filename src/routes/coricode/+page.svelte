
<script>
  import { onMount } from 'svelte';
  import Events from './Events.svelte';
  import Conditions from './Conditions.svelte';
  import Actions from './Actions.svelte';
  import Plans from './Plans.svelte';
  
  let activeView = 'events';
  
  function setView(view) {
    console.log("Setting active view to:", view);
    activeView = view;
  }
</script>

<div class="navbar">
  <a class={activeView === 'events' ? 'active' : ''} 
     on:click={() => setView('events')}>Events</a>
  <a class={activeView === 'conditions' ? 'active' : ''} 
     on:click={() => setView('conditions')}>Conditions</a>
  <a class={activeView === 'actions' ? 'active' : ''} 
     on:click={() => setView('actions')}>Actions</a>
  <a class={activeView === 'plans' ? 'active' : ''} 
     on:click={() => setView('plans')}>Plans</a>
</div>

<!-- 

{#if activeView === 'conditions'}
  <Conditions />
{/if}

{#if activeView === 'actions'}
  <Actions />
{/if}  -->

{#if activeView === 'plans'}
  <Plans/>
{/if} 

{#if activeView === 'events'}
  <Events />
{/if}

{#if activeView === 'actions'}
  <Actions />
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
</style>
