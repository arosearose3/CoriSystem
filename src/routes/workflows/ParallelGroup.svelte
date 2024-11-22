<script>
    export let nodes = [];
    export let onComplete = () => {};
  
    function handleNodeComplete(nodeId) {
      const allCompleted = nodes.every(n => n.status === 'completed');
      if (allCompleted) {
        onComplete();
      }
    }
</script>
  
  <div class="relative border-2 border-dashed border-gray-300 p-4 rounded">
    <div class="absolute -top-3 left-4 bg-white px-2 text-sm text-gray-600">
      Parallel Execution
    </div>
  
    <div class="grid grid-cols-{nodes.length} gap-4">
      {#each nodes as node}
        <div class="flex flex-col items-center">
          <svelte:component 
            this={node.component}
            {...node.props}
            on:complete={() => handleNodeComplete(node.id)}
          />
        </div>
      {/each}
    </div>
  </div>