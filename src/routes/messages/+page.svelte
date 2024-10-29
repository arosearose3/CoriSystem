<!-- Messages.svelte -->
<script>
    import Compose from './Compose.svelte';
    import Inbox from './Inbox.svelte';
    import Sent from './Sent.svelte';
    import Trash from './Trash.svelte';
  
    let activeView = 'inbox';
  
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
      <a class={activeView === 'compose' ? 'active' : ''} on:click={() => setView('compose')}>Compose</a>
      <a class={activeView === 'inbox' ? 'active' : ''} on:click={() => setView('inbox')}>Inbox</a>
      <a class={activeView === 'sent' ? 'active' : ''} on:click={() => setView('sent')}>Sent</a>
      <a class={activeView === 'trash' ? 'active' : ''} on:click={() => setView('trash')}>Trash</a>
    </div>
  
    <div class="content">
      {#if activeView === 'compose'}
        <Compose />
      {:else if activeView === 'inbox'}
        <Inbox />
      {:else if activeView === 'sent'}
        <Sent />
      {:else if activeView === 'trash'}
        <Trash />
      {/if}
    </div>
  </div>
  