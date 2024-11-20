<script>
  import { writable } from 'svelte/store';
  import FieldCard from './FieldCard.svelte';
  import DynamicUI from './DynamicUI.svelte';
  import PreviewPane from './PreviewPane.svelte';
  import PropertyPalette from './PropertyPalette.svelte';

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

  function updateTemplate(event) {
    const { name, updates } = event.detail;
    templates.update(current => 
      current.map(field => 
        field.name === name ? { ...field, ...updates } : field
      )
    );
  }

  function updateFieldName(event) {
    const { oldName, newName } = event.detail;
    if (newName.trim() === '') return;
    templates.update(current => 
      current.map(field => 
        field.name === oldName ? { ...field, name: newName } : field
      )
    );
  }

  function deleteTemplate(event) {
    const name = event.detail;
    templates.update(current => 
      current.filter(field => field.name !== name)
    );
  }

  function cloneTemplate(event) {
    const field = event.detail;
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
              <FieldCard
                {field}
                on:update={updateTemplate}
                on:nameChange={updateFieldName}
                on:delete={deleteTemplate}
                on:clone={cloneTemplate}
              />
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
</style>