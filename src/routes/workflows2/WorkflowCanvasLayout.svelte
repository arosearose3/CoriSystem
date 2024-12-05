
<script>
    import Canvas from './WorkflowCanvas.svelte';
    import ActivityPalette from './ActivityPalette.svelte';
    import EventPalette from './EventPalette.svelte';
  </script>
  
  <div class="workflow-container">
    <div class="sidebar">
      <div class="palette-section">
        <EventPalette />
      </div>
      <div class="divider"></div>
      <div class="palette-section">
        <ActivityPalette />
      </div>
    </div>
    
    <div class="canvas-section">
      <Canvas />
    </div>
  </div>
  
  <style>
    .workflow-container {
      display: flex;
      width: 100%;
      height: 100vh;
    }
  
    .sidebar {
      width: 300px;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  
    .palette-section {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }
  
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 0;
    }
  
    .canvas-section {
      flex: 1;
      overflow: hidden;
    }
  </style>