<script>
  import ActivityPalette from './ActivityPalette.svelte';
  import EventPalette from './EventPalette.svelte';
  import Canvas from './WorkflowCanvas.svelte';
  import PreviewPane from './PreviewPane.svelte';
  import PropertiesPane from './PropertiesPanel.svelte';
  import Toolbar from './WorkflowToolbar.svelte';
  import { workflowStore } from '$lib/stores/workflow';

  let workflow = $workflowStore;
</script>

<main class="editor-main">
  <div class="left-panel">
    <div class="event-palette">
      <EventPalette />
    </div>
    <div class="activity-palette">
      <ActivityPalette />
    </div>
  </div>
  
  <div class="center-panel">
    <Canvas />
  </div>
  
  <div class="right-panel">
    <div class="preview-section">
      <PreviewPane />
    </div>
    <div class="properties-section">
      <PropertiesPane />
    </div>
  </div>
</main>

<style>
  .workflow-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .editor-header {
    flex: 0 0 60px;
    border-bottom: 1px solid #e5e7eb;
    background: white;
  }

  .editor-main {
    flex: 1;
    display: flex;
    min-height: 0; /* Critical for nested scrolling */
  }

  .left-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .center-panel {
    flex: 1;
    min-width: 0;  /* Critical for flex layout */
    background: #f9fafb;
    overflow: hidden; /* Canvas handles own scrolling */
  }

  .right-panel {
    flex: 0 0 320px;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #e5e7eb;
    background: white;
  }

  .preview-section {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-bottom: 1px solid #e5e7eb;
  }

  .properties-section {
    flex: 0 0 300px;
    overflow-y: auto;
  }

  .event-palette {
    flex: 0 0 auto;
    border-bottom: 1px solid #e5e7eb;
    max-height: 40%;
    overflow-y: auto;
  }

  .activity-palette {
    flex: 1;
    overflow-y: auto;
  }

</style>