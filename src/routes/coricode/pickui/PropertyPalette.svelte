<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
  
    const properties = [
      'ClientName',
      'ClientFirstName',
      'ClientLastName',
      'OrganizationName',
      'PractitionerName'
    ];
  
    let dragging = false;
    let x = 20;
    let y = 80;
    let dragStartX = 0;
    let dragStartY = 0;
    let statusText = 'Click to copy';
    let statusTimeout;
  
    function startDragging(event) {
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
  
    function copyProperty(prop) {
      navigator.clipboard.writeText('${' + prop + '}');
      clearTimeout(statusTimeout);
      
      statusText = 'Copied';
      statusTimeout = setTimeout(() => {
        statusText = 'Click to copy';
      }, 1000);
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
    class="fixed bg-white rounded border border-gray-200 shadow-lg"
    style="left: {x}px; top: {y}px; width: 300px;"
  >
    <!-- Drag handle -->
    <div
      class="h-3 bg-gray-100 border-b border-gray-200 rounded-t cursor-move select-none"
      on:mousedown={startDragging}
    />
  
    <!-- Content -->
    <div class="p-2">
      <!-- Status text -->
      <div class="text-[8px] text-gray-500 mb-2 h-2">
        {#key statusText}
          <div in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
            {statusText}
          </div>
        {/key}
      </div>
  
      <!-- Property list -->
      <div class="flex flex-col space-y-0.5">
        {#each properties as prop}
          <button
            class="w-full text-left px-2 py-1 rounded text-[0.65rem] font-mono text-blue-600 hover:bg-blue-50 transition-all duration-150 transform hover:scale-105"
            on:click={() => copyProperty(prop)}
          >
            ${prop}
          </button>
        {/each}
      </div>
    </div>
  </div>
  
  <style>
    button {
      transition: all 0.15s ease-in-out;
    }
  
    button:active {
      transform: scale(0.98);
    }
  
    /* Prevent text selection during drag */
    div {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
  </style>