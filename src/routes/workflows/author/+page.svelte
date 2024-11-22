// routes/workflows/author/+page.svelte
<script>
  import { onMount } from 'svelte';
  import WorkflowCanvas from '../WorkflowCanvas.svelte';
  import ActivityPalette from '../ActivityPalette.svelte';
  import PropertiesPanel from '../PropertiesPanel.svelte';
  import { workflowStore } from '$lib/stores/workflow';

  let recentWorkflows = [];
  let selectedElement = null;

  onMount(async () => {
    recentWorkflows = await fetchRecentWorkflows();
  });

  async function fetchRecentWorkflows() {
    // Fetch from API
    return [
      { id: 1, name: 'Housing Assistance', lastModified: '2024-01-20' },
      { id: 2, name: 'PRAPARE Assessment', lastModified: '2024-01-19' }
    ];
  }
</script>

<div class="grid grid-cols-12 gap-4 h-full">
  <div class="col-span-2 bg-white shadow rounded p-4">
    <ActivityPalette />
  </div>
  
  <div class="col-span-8 bg-white shadow rounded">
    <WorkflowCanvas
      bind:selectedElement
      store={workflowStore}
    />
  </div>
  
  <div class="col-span-2 bg-white shadow rounded p-4">
    <PropertiesPanel {selectedElement} />
  </div>
</div>