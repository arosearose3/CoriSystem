<!-- Nav.svelte -->
<script>
  import { onMount } from 'svelte';
  import ChoosePlanTemplate from './ChoosePlanTemplate.svelte';
  import UserPlanList from './UserPlanList.svelte';
  import ActivePlans from './ActivePlans.svelte';

  let activeView = 'current-plans'; // Default to current plans

  function setView(view) {
    console.log("Setting active view to:", view);
    activeView = view;
  }
</script>

<div class="navbar">
  <a 
    class={activeView === 'current-plans' ? 'active' : ''} 
    on:click={() => setView('current-plans')}
  >
    Current Plans
  </a>
  <a 
    class={activeView === 'plans' ? 'active' : ''} 
    on:click={() => setView('plans')}
  >
    Plan Templates
  </a>
  <a 
    class={activeView === 'add-plan' ? 'active' : ''} 
    on:click={() => setView('add-plan')}
  >
    Add/Edit Plan
  </a>
</div>

{#if activeView === 'current-plans'}
  <ActivePlans />
{:else if activeView === 'plans'}
  <ChoosePlanTemplate />
{:else if activeView === 'add-plan'}
  <UserPlanList />
{/if}

<style>
  .navbar {
    display: flex;
    gap: 1rem;
    background-color: #1e293b;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem;
  }

  .navbar a {
    color: #e2e8f0;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .navbar a:hover {
    background-color: #334155;
  }

  .active {
    background-color: #3b82f6;
    color: white !important;
  }

  .active:hover {
    background-color: #2563eb !important;
  }
</style>