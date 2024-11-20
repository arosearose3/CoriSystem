<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
  
    const properties = [
      'ClientName',
      'ClientFirstName',
      'ClientLastName',
      'OrganizationName',
      'PractitionerName'
    ];
  
    let dragging = false;
    let x = 100;
    let y = 100;
    let dragStartX = 0;
    let dragStartY = 0;
    let statusText = 'Click to insert';
    let statusTimeout;
    
    const dispatch = createEventDispatcher();
  
    function startDragging(event) {
      if (event.target.classList.contains('property-button')) {
        return; // Don't start drag if clicking a property button
      }
      dragging = true;
      dragStartX = event.clientX - x;
      dragStartY = event.clientY - y;
    }
  
    function handleDrag(event) {
      if (dragging) {
        x = event.clientX - dragStartX;
        y = event.clientY - dragStartY;
      }
    }
  
    function stopDragging() {
      dragging = false;
    }
  
    function insertProperty(prop) {
      const textToInsert = '${' + prop + '}';
      
      // Dispatch the text to be inserted
      dispatch('itemSelected', {
        text: textToInsert
      });
      
      clearTimeout(statusTimeout);
      statusText = ''; // Clear status to smooth transitions
  
      // Show "Inserted" and then revert to "Click to insert" after a delay
      setTimeout(() => {
        statusText = 'Inserted';
        statusTimeout = setTimeout(() => {
          statusText = 'Click to insert';
        }, 1000);
      }, 10);
    }
  
    function closeDialog() {
      dispatch('close');
    }
  
    onMount(() => {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', stopDragging);
  
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDragging);
        clearTimeout(statusTimeout);
      };
    });
</script>

<div
  class="dialog"
  style="left: {x}px; top: {y}px;"
>
  <div class="drag-bar" on:mousedown={startDragging}>
    <button class="close-button" on:click={closeDialog}>✕</button>
  </div>

  <div class="content">
    <div class="status-text">
      {#key statusText}
        <div in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
          {statusText}
        </div>
      {/key}
    </div>

    <div class="property-list">
      {#each properties as prop}
        <button
          class="property-button"
          on:click={() => insertProperty(prop)}
        >
          ${prop}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .dialog {
    position: fixed;
    background-color: white;
    border: 2px solid black;
    border-radius: 8px;
    width: 300px;
    z-index: 1000;
    padding: 0;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .drag-bar {
    height: 20px;
    background-color: #333;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    cursor: move;
    position: relative;
  }

  .close-button {
    position: absolute;
    top: 2px;
    right: 8px;
    background: transparent;
    border: none;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    color: white;
  }

  .close-button:hover {
    color: #ff0000;
  }

  .content {
    padding: 20px;
  }

  .status-text {
    font-size: 10px;
    color: gray;
    margin-bottom: 10px;
  }

  .property-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .property-button {
    text-align: left;
    padding: 8px 12px;
    font-size: 0.85rem;
    font-family: monospace;
    color: #007bff;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
  }

  .property-button:hover {
    background-color: #eef5ff;
    transform: scale(1.02);
  }

  .dialog, .drag-bar {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>