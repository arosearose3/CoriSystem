<script>
    import { createEventDispatcher } from 'svelte';
    import { 
      ZoomIn, 
      ZoomOut, 
      MousePointer, 
      Hand,
      RotateCw,
      Grid
    } from 'lucide-svelte';
  
    const dispatch = createEventDispatcher();
  
    export let zoom = 1;
    export let mode = 'select'; // select, pan, connect
    export let showGrid = true;
  
    function handleZoom(delta) {
      zoom = Math.max(0.5, Math.min(2, zoom + delta));
      dispatch('zoom', { zoom });
    }
  
    function toggleMode(newMode) {
      mode = mode === newMode ? 'select' : newMode;
      dispatch('modeChange', { mode });
    }
  
    function handleReset() {
      zoom = 1;
      dispatch('reset');
    }
  </script>
  
  <div class="absolute bottom-4 right-4 flex flex-col space-y-2">
    <div class="bg-white rounded-lg shadow-lg p-2 space-y-2">
      <!-- Zoom Controls -->
      <button
        class="p-2 hover:bg-gray-100 rounded"
        on:click={() => handleZoom(0.1)}
      >
        <ZoomIn class="w-5 h-5" />
      </button>
      <button
        class="p-2 hover:bg-gray-100 rounded"
        on:click={() => handleZoom(-0.1)}
      >
        <ZoomOut class="w-5 h-5" />
      </button>
      
      <div class="border-t my-2" />
      
      <!-- Mode Controls -->
      <button
        class="p-2 hover:bg-gray-100 rounded"
        class:bg-blue-50={mode === 'select'}
        on:click={() => toggleMode('select')}
      >
        <MousePointer class="w-5 h-5" />
      </button>
      <button
        class="p-2 hover:bg-gray-100 rounded"
        class:bg-blue-50={mode === 'pan'}
        on:click={() => toggleMode('pan')}
      >
        <Hand class="w-5 h-5" />
      </button>
      
      <div class="border-t my-2" />
      
      <!-- Additional Controls -->
      <button
        class="p-2 hover:bg-gray-100 rounded"
        on:click={handleReset}
      >
        <RotateCw class="w-5 h-5" />
      </button>
      <button
        class="p-2 hover:bg-gray-100 rounded"
        class:bg-blue-50={showGrid}
        on:click={() => dispatch('toggleGrid')}
      >
        <Grid class="w-5 h-5" />
      </button>
    </div>
  </div>