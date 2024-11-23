<script>
  import ActivityPalette from './ActivityPalette.svelte';
  import WorkflowCanvas from './WorkflowCanvas.svelte';
  import PropertiesPanel from './PropertiesPanel.svelte';
  import WorkflowToolbar from './WorkflowToolbar.svelte';
  import { workflowStore, selectedElementStore } from '$lib/stores/workflow';
  import { onMount } from 'svelte';

  let recentWorkflows = [];

  onMount(async () => {
    workflowStore.reset();
    recentWorkflows = await fetchRecentWorkflows();
  });

  async function fetchRecentWorkflows() {
    // In real implementation, this would fetch from an API
    return [
      { id: 1, name: 'Housing Assistance', lastModified: '2024-01-20' },
      { id: 2, name: 'PRAPARE Assessment', lastModified: '2024-01-19' },
    ];
  }

  function handlePropertyUpdate(event) {
    const { element, changes } = event.detail;
    workflowStore.updateElement(element.id, changes);
  }
</script>

<!-- Main container to lay out components horizontally -->
<div class="main-container">
  <!-- Left Side: Workflow Toolbar, Canvas, and Properties Panel -->
  <div class="left-container">
    <!-- Workflow Toolbar -->
    <div class="toolbar-container">
      <WorkflowToolbar />
    </div>

    <!-- Workflow Canvas (takes up most of the available space) -->
    <div class="canvas-container">
      <WorkflowCanvas />
    </div>

    <!-- Properties Panel positioned below the canvas -->
    <div class="properties-panel-container">
      <PropertiesPanel
        element={$selectedElementStore}
        on:update={handlePropertyUpdate}
      />
    </div>
  </div>

  <!-- Right Side: Activity Palette -->
  <div class="activity-palette-container">
    <ActivityPalette />
  </div>
</div>

<style>
  .main-container {
    display: flex;
    height: 100vh; /* Full view height */
    overflow: hidden; /* Prevent overflow of the page */
  }

  .left-container {
    display: flex;
    flex-direction: column; /* Stack toolbar, canvas, and properties panel vertically */
    width: calc(100% - 320px); /* Take remaining space, 320px reserved for the activity palette */
    max-width: calc(100% - 320px); /* Ensure left side does not exceed available space */
    border-right: 1px solid #e5e7eb; /* Tailwind's border-gray-200 equivalent */
  }

  .toolbar-container {
    padding: 1rem; /* Adds space around the toolbar */
    border-bottom: 1px solid #e5e7eb; /* Separator below the toolbar */
  }

  .canvas-container {
    flex: 1; /* Fills remaining vertical space */
    padding: 1rem;
    overflow: auto; /* Allows scrolling if content exceeds the available area */
  }

  .properties-panel-container {
    padding: 1rem;
    border-top: 1px solid #e5e7eb; /* Separator above the properties panel */
  }

  .activity-palette-container {
    width: 320px; /* Fixed width for the activity palette */
    flex-shrink: 0; /* Prevents shrinking so it always remains 320px */
    padding: 1rem;
    border-left: 1px solid #e5e7eb; /* Separator to the left of the activity palette */
    overflow-y: auto; /* Allows scrolling if there are many activities */
  }
</style>
