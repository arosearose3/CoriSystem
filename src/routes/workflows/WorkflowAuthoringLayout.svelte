<script>
  import ActivityPalette from './ActivityPalette.svelte';
  import WorkflowCanvas from './WorkflowCanvas.svelte';
  import PropertiesPanel from './PropertiesPanel.svelte';
  import WorkflowToolbar from './WorkflowToolbar.svelte';  
   import PreviewPane from './PreviewPane.svelte';

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
<!-- Main container with three columns -->
<div class="main-container">
  <!-- Left Side: Preview Pane -->
  <div class="preview-pane-container">
    <PreviewPane />
  </div>

  <!-- Center: Workflow Toolbar, Canvas, and Properties Panel -->
  <div class="center-container">
    <!-- Workflow Toolbar -->
    <div class="toolbar-container">
      <WorkflowToolbar />
    </div>

    <!-- Workflow Canvas -->
    <div class="canvas-container">
      <WorkflowCanvas />
    </div>

    <!-- Properties Panel -->
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
    height: 100vh;
    overflow: hidden;
  }

  .preview-pane-container {
    width: 280px; /* Fixed width for preview pane */
    flex-shrink: 0;
    border-right: 1px solid #e5e7eb;
    background-color: #f9fafb; /* Light gray background */
    overflow-y: auto;
  }

  .center-container {
    display: flex;
    flex-direction: column;
    flex: 1; /* Takes up remaining space between preview and palette */
    min-width: 0; /* Allows center container to shrink below its content width */
    border-right: 1px solid #e5e7eb;
  }

  .toolbar-container {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .canvas-container {
    flex: 1;
    padding: 1rem;
    overflow: auto;
    background-color: #ffffff;
  }

  .properties-panel-container {
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }

  .activity-palette-container {
    width: 320px;
    flex-shrink: 0;
    padding: 1rem;
    overflow-y: auto;
    background-color: #f9fafb;
  }
</style>