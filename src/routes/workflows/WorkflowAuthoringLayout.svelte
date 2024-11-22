<script>
    import ActivityPalette from './components/palette/ActivityPalette.svelte';
    import WorkflowCanvas from './components/canvas/WorkflowCanvas.svelte';
    import PropertiesPanel from './components/properties/PropertiesPanel.svelte';
    import WorkflowToolbar from './components/toolbar/WorkflowToolbar.svelte';
    
    let selectedElement = null;
    let currentWorkflow = null;
  
    function handlePropertyUpdate(event) {
      const { element, changes } = event.detail;
      // Update workflow with changes
      currentWorkflow = updateWorkflowElement(currentWorkflow, element.id, changes);
    }
  </script>
  
  <div class="grid grid-cols-12 h-screen bg-white">
    <div class="col-span-2 border-r border-gray-200">
      <ActivityPalette />
    </div>
    
    <div class="col-span-8">
      <WorkflowToolbar />
      <WorkflowCanvas 
        bind:selectedElement
        bind:workflow={currentWorkflow}
      />
    </div>
    
    <div class="col-span-2 border-l border-gray-200">
      <PropertiesPanel 
        element={selectedElement}
        on:update={handlePropertyUpdate}
      />
    </div>
  </div>