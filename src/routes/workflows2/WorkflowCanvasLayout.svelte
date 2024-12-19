<script>
  import Canvas from './WorkflowCanvas.svelte';
  import ActivityPalette from './ActivityPalette.svelte';
  import EventPalette from './EventPalette.svelte';
</script>

<div class="workflow-container">
<div class="sidebar">
  <div class="palette-section">
    <ActivityPalette />
    <EventPalette />
  </div>
</div>
<div class="canvas-section">
  <Canvas />
</div>
</div>

<style>
  .activity-palette,
.event-palette {
  flex-shrink: 0;
  margin-bottom: 0;  /* Remove bottom margin */
}

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
position: relative;
}

.palette-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;  /* Remove gap between palettes */
}

/* Titles for sections */
.section-title {
font-size: 1.25rem;
font-weight: bold;
margin: 16px;
}

.events-section-title {
margin-top: 32px;
}

/* Canvas remains flexible */
.canvas-section {
flex: 1;
overflow: hidden;
}
</style>
