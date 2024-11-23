<script>
    import Save from 'lucide-svelte/icons/save';
    import Play from 'lucide-svelte/icons/play'; 
    import Download from 'lucide-svelte/icons/download';
    import Upload from 'lucide-svelte/icons/upload'; 
    import Copy from 'lucide-svelte/icons/copy';
    import Trash2 from 'lucide-svelte/icons/trash-2'; 
    import Undo from 'lucide-svelte/icons/undo';
    import Redo from 'lucide-svelte/icons/redo'; 
  
    import { createEventDispatcher } from 'svelte';
  
    const dispatch = createEventDispatcher();
  
    export let canUndo = false;
    export let canRedo = false;
    export let isDirty = false;
  
    function handleSave() {
      dispatch('save');
    }
  
    function handleTest() {
      dispatch('test');
    }
  
    function handleExport() {
      dispatch('export');
    }
  
    function handleImport() {
      dispatch('import');
    }
  
    function handleDelete() {
      if (confirm('Are you sure you want to delete this workflow?')) {
        dispatch('delete');
      }
    }
  
    function handleUndo() {
      dispatch('undo');
    }
  
    function handleRedo() {
      dispatch('redo');
    }
  
    function handleDuplicate() {
      dispatch('duplicate');
    }
  </script>
  
  <!-- Toolbar with All Icons in a Horizontal Row -->
  <div class="border-b border-gray-200 p-2 flex items-center justify-start bg-white space-x-4">
    <!-- Save -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip"
      class:text-blue-500={isDirty}
      on:click={handleSave}
      data-tip="Save workflow"
    >
      <Save class="w-5 h-5" />
    </button>
  
    <!-- Undo -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip"
      class:opacity-50={!canUndo}
      disabled={!canUndo}
      on:click={handleUndo}
      data-tip="Undo"
    >
      <Undo class="w-5 h-5" />
    </button>
  
    <!-- Redo -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip" 
      class:opacity-50={!canRedo}
      disabled={!canRedo}
      on:click={handleRedo}
      data-tip="Redo"
    >
      <Redo class="w-5 h-5" />
    </button>
  
    <!-- Test Workflow -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip"
      on:click={handleTest}
      data-tip="Test workflow"
    >
      <Play class="w-5 h-5" />
    </button>
  
    <!-- Duplicate Workflow -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip"
      on:click={handleDuplicate}
      data-tip="Duplicate workflow"
    >
      <Copy class="w-5 h-5" />
    </button>
  
    <!-- Export Workflow -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip"
      on:click={handleExport}
      data-tip="Export workflow"
    >
      <Download class="w-5 h-5" />
    </button>
  
    <!-- Import Workflow -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip"
      on:click={handleImport}
      data-tip="Import workflow"
    >
      <Upload class="w-5 h-5" />
    </button>
  
    <!-- Delete Workflow -->
    <button
      class="p-2 hover:bg-gray-100 rounded-md tooltip text-red-500"
      on:click={handleDelete}
      data-tip="Delete workflow"
    >
      <Trash2 class="w-5 h-5" />
    </button>
  </div>
  
  <style>
    .tooltip {
      position: relative;
    }
  
    .tooltip::after {
      content: attr(data-tip);
      position: absolute;
      bottom: -2rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.25rem 0.5rem;
      background: #333;
      color: white;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      white-space: nowrap;
    }
  
    .tooltip:hover::after {
      opacity: 1;
    }
  </style>
  