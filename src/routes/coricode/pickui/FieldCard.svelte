<script>
    import { createEventDispatcher } from 'svelte';
    import Copy from 'lucide-svelte/icons/copy';
    import Trash2 from 'lucide-svelte/icons/trash-2'; 
    import PickUI from './PickUI.svelte';
  
    export let field;
    
    const dispatch = createEventDispatcher();
  
    function handleNameChange(e) {
      if (e.target.value.trim() === '') return;
      dispatch('nameChange', {
        oldName: field.name,
        newName: e.target.value
      });
    }
  
    function handleFieldUpdate(detail) {
      dispatch('update', {
        name: field.name,
        updates: detail
      });
    }
  
    function handleClone() {
      dispatch('clone', field);
    }
  
    function handleDelete() {
      dispatch('delete', field.name);
    }
  </script>
  
  <div class="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
    <div class="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
      {#if field.name === 'API Path'}
        <h3 class="font-medium text-gray-900">{field.name}</h3>
      {:else}
        <input
          type="text"
          class="font-medium text-gray-900 border border-transparent bg-transparent hover:bg-white hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 w-64"
          value={field.name}
          on:change={handleNameChange}
        />
      {/if}
      <div class="flex gap-2">
        {#if field.name !== 'API Path'}
          <button 
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            title="Clone field"
            on:click={handleClone}
          >
           C <!-- <Copy class="w-4 h-4 text-gray-500" /> -->
          </button>
          <button 
            class="p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Delete field"
            on:click={handleDelete}
          >
            D<!-- <Trash2 class="w-4 h-4 text-red-500" /> -->
          </button>
        {/if}
      </div>
    </div>
    
    <div class="p-4">
      <PickUI 
        {field}
        on:update={e => handleFieldUpdate(e.detail)}
      />
    </div>
  </div>
  
  <style>
    button {
      transition: all 0.2s;
    }
    
    button:hover {
      transform: translateY(-1px);
    }
  
    button:active {
      transform: translateY(0px);
    }
  
    input {
      outline: none;
    }
  </style>