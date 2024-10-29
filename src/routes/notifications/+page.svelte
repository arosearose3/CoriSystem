<script>
    import Send from './Send.svelte';
    import Received from './Received.svelte';
    import Sent from './Sent.svelte';

    let activeView = 'send';

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
      <a class={activeView === 'send' ? 'active' : ''} on:click={() => setView('send')}>Send</a>
      <a class={activeView === 'received' ? 'active' : ''} on:click={() => setView('received')}>Received</a>
      <a class={activeView === 'sent' ? 'active' : ''} on:click={() => setView('sent')}>Sent</a>
    </div>

    <div class="content">
      {#if activeView === 'send'}
        <Send />
      {:else if activeView === 'received'}
        <Received />
      {:else if activeView === 'sent'}
        <Sent />
      {/if}
    </div>
</div>