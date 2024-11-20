<!-- src/routes/communications/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import CommunicationViewer from './CommunicationViewer.svelte';
    import CommunicationAuthor from './CommunicationAuthor.svelte';
  
    let activeTab = 'view'; // 'view' or 'create'
    let viewerComponent;
  
    function handleMessageSent() {
      // Switch to view tab and refresh messages
      activeTab = 'view';
      if (viewerComponent) {
        viewerComponent.loadMessages();
      }
    }
  </script>
  
  <div class="communications-page">
    <div class="nav-tabs">
      <button 
        class:active={activeTab === 'view'} 
        on:click={() => activeTab = 'view'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        Messages
      </button>
      <button 
        class:active={activeTab === 'create'} 
        on:click={() => activeTab = 'create'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New Message
      </button>
    </div>
  
    <div class="content">
      {#if activeTab === 'view'}
        <CommunicationViewer bind:this={viewerComponent} />
      {:else}
        <CommunicationAuthor 
          on:sent={handleMessageSent}
        />
      {/if}
    </div>
  </div>
  
  <style>
    .communications-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
  
    .nav-tabs {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
  
    button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: none;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;
    }
  
    button:hover {
      background-color: #f3f4f6;
      color: #111827;
    }
  
    button.active {
      color: #2563eb;
      background-color: #eff6ff;
      font-weight: 500;
    }
  
    .icon {
      width: 1.25rem;
      height: 1.25rem;
    }
  
    .content {
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      min-height: 400px;
    }
  
    /* Responsive Design */
    @media (max-width: 640px) {
      .communications-page {
        padding: 10px;
      }
  
      .nav-tabs {
        gap: 0.5rem;
      }
  
      button {
        padding: 0.5rem;
        font-size: 0.875rem;
      }
  
      .icon {
        width: 1rem;
        height: 1rem;
      }
    }
  </style>