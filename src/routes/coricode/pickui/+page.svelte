<script>
    import { writable } from 'svelte/store';
    import PickUI from './PickUI.svelte';
    import DynamicUI from './DynamicUI.svelte';
    import PreviewPane from './PreviewPane.svelte';
    import PropertyPalette from './PropertyPalette.svelte';


    import Copy from 'lucide-svelte/icons/copy';
    import Trash2 from 'lucide-svelte/icons/trash-2';

  
    let fieldCounter = 1;
    const templates = writable([
      {
        name: "API Path",
        type: 'fixed-text',
        widgetType: null,
        value: ''
      }
    ]);
  
    let activeTabIndex = 0;
    let showPalette = false;
  
    const tabs = [
      { id: 'design', label: 'Design' },
      { id: 'preview', label: 'Preview' }
    ];
  
    function addTemplate() {
      fieldCounter++;
      templates.update(current => [
        ...current,
        {
          name: `Field ${fieldCounter}`,
          type: 'fixed-text',
          widgetType: null,
          value: ''
        }
      ]);
    }
  
    function updateTemplate(name, updates) {
      templates.update(current => 
        current.map(field => 
          field.name === name ? { ...field, ...updates } : field
        )
      );
    }
  
    function updateFieldName(oldName, newName) {
      if (newName.trim() === '') return; // Prevent empty names
      templates.update(current => 
        current.map(field => 
          field.name === oldName ? { ...field, name: newName } : field
        )
      );
    }
  
    function deleteTemplate(name) {
      templates.update(current => 
        current.filter(field => field.name !== name)
      );
    }
  
    function cloneTemplate(field) {
      fieldCounter++;
      templates.update(current => [
        ...current,
        {
          ...field,
          name: `Field ${fieldCounter}`,
        }
      ]);
    }
  
    function togglePalette() {
      showPalette = !showPalette;
    }
  </script>
  
  <div class="p-4 max-w-4xl mx-auto relative">
    <!-- Global Properties Button - Always visible -->
    <div class="absolute right-4 top-4 z-10">
      <button
        class="px-3 py-1.5 text-sm bg-white border shadow-sm hover:bg-gray-50 text-gray-700 rounded-lg transition-colors duration-200 flex items-center gap-2"
        on:click={togglePalette}
      >
        {showPalette ? 'Hide' : 'Show'} Properties
      </button>
    </div>
  
    {#if showPalette}
      <PropertyPalette />
    {/if}
  
    <!-- Tab Navigation -->
    <div class="flex gap-2 mb-6 border-b">
      {#each tabs as tab, i}
        <button
          class="px-4 py-2 {activeTabIndex === i ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}"
          on:click={() => activeTabIndex = i}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  
    <!-- Preview Pane -->
    <PreviewPane fields={$templates} />
  
    <!-- Tab Content -->
    <div class="mb-4">
      {#if activeTabIndex === 0}
        <!-- Design View -->
        <div class="space-y-6">
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
            on:click={addTemplate}
          >
            Add Field
          </button>
  
          {#if $templates.length > 0}
            <div class="space-y-6">
              {#each $templates as field (field.name)}
                <div class="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div class="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
                    {#if field.name === 'API Path'}
                      <h3 class="font-medium text-gray-900">{field.name}</h3>
                    {:else}
                      <input
                        type="text"
                        class="font-medium text-gray-900 border border-transparent bg-transparent hover:bg-white hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 w-64"
                        value={field.name}
                        on:change={(e) => updateFieldName(field.name, e.target.value)}
                      />
                    {/if}
                    <div class="flex gap-2">
                      {#if field.name !== 'API Path'}
                        <button 
                          class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                          title="Clone field"
                          on:click={() => cloneTemplate(field)}
                        >
                          <Copy class="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          class="p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete field"
                          on:click={() => deleteTemplate(field.name)}
                        >
                          <Trash2 class="w-4 h-4 text-red-500" />
                        </button>
                      {/if}
                    </div>
                  </div>
                  
                  <div class="p-4">
                    <PickUI 
                      {field}
                      on:update={({detail}) => updateTemplate(field.name, detail)}
                    />
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
              No fields added yet. Click "Add Field" to start.
            </div>
          {/if}
        </div>
      {:else}
        <!-- Preview View -->
        <DynamicUI fields={$templates} />
      {/if}
    </div>
  </div>
  
  <style>
    :global(body) {
      background-color: #f9fafb;
    }
  
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