<!-- src/routes/referrals/+page.svelte -->
<script>
    import Create from './Create.svelte';
    import Active from './Active.svelte';
    import Completed from './Completed.svelte';
  
    let activeView = 'create';
  
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
  <div class="navbar">
    <a class={activeView === 'create' ? 'active' : ''} on:click={() => setView('create')}>Create</a>
    <a class={activeView === 'active' ? 'active' : ''} on:click={() => setView('active')}>Active</a>
    <a class={activeView === 'completed' ? 'active' : ''} on:click={() => setView('completed')}>Completed</a>
  </div>

  <div class="content">
    {#if activeView === 'create'}
      <Create />
    {:else if activeView === 'active'}
      <Active />
    {:else if activeView === 'completed'}
      <Completed />
    {/if}
  </div>
</div>
