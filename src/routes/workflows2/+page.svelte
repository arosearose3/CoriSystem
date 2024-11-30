<script>
    import { currentView } from './workflowstore.js';
    import Navigation from './Navigation.svelte';
    import TaskManagement from './TaskManagement.svelte';
    import EventManagement from './EventManagement.svelte';
    import WorkflowCanvasLayout from './WorkflowCanvasLayout.svelte';
  import WorkflowCanvas from './WorkflowCanvas.svelte';

  
  let taskComponent;
  let eventComponent;
  
  function handleCloseTaskEditor() {
    taskComponent.handleCloseEditor();
  }
  
  function handleCloseEventEditor() {
    eventComponent.handleCloseEditor();
  }
</script>

<Navigation />

<main class="container mx-auto">
  {#if $currentView === 'tasks'}
    <TaskManagement 
      bind:this={taskComponent}
      on:editTemplate
      on:newTemplate
    />
  {:else if $currentView === 'events'}
    <EventManagement
      bind:this={eventComponent}
      on:editDefinition
      on:newDefinition
    />
  {:else if $currentView === 'workflow-canvas'}
    <div class="p-4">
      <h1 class="text-2xl font-bold">Workflow Canvas</h1>
      <WorkflowCanvasLayout />  
    </div>
  {:else if $currentView === 'workflows'}
    <div class="p-4">
      <h1 class="text-2xl font-bold">Workflows</h1>
      <!-- Workflows component would go here -->
    </div>
  {/if}
</main>