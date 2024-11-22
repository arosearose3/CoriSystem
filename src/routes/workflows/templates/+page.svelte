// routes/workflows/templates/+page.svelte
<script>
  import { onMount } from 'svelte';
  import { Plus, FolderOpen } from 'lucide-svelte';

  let templates = [];
  let categories = [];
  let selectedCategory = 'all';

  onMount(async () => {
    templates = await fetchTemplates();
    categories = await fetchCategories();
  });

  $: filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);
</script>

<div class="p-4">
  <div class="flex justify-between mb-4">
    <div class="flex items-center space-x-4">
      <h2 class="text-lg font-semibold">Workflow Templates</h2>
      <select 
        bind:value={selectedCategory}
        class="border rounded px-2 py-1"
      >
        <option value="all">All Categories</option>
        {#each categories as category}
          <option value={category.id}>{category.name}</option>
        {/each}
      </select>
    </div>

    <button class="px-4 py-2 bg-blue-500 text-white rounded flex items-center">
      <Plus class="w-4 h-4 mr-2" />
      New Template
    </button>
  </div>

  <div class="grid grid-cols-3 gap-4">
    {#each filteredTemplates as template}
      <div class="bg-white shadow rounded p-4 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="font-medium">{template.name}</h3>
            <p class="text-sm text-gray-500">{template.description}</p>
          </div>
          <span class="px-2 py-1 bg-gray-100 rounded text-xs">
            {template.category}
          </span>
        </div>
        
        <div class="mt-4 flex items-center justify-between text-sm">
          <span class="text-gray-500">
            Used {template.usageCount} times
          </span>
          <button class="text-blue-500 hover:text-blue-700 flex items-center">
            <FolderOpen class="w-4 h-4 mr-1" />
            Use Template
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>