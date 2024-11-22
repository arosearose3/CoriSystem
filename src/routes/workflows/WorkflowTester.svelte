<script>
    import { createEventDispatcher } from 'svelte';
    
    export let workflow;
    let testResults = [];
    let testEvents = [];
    const dispatch = createEventDispatcher();
  
    async function runTest() {
      testResults = [];
      for (const event of testEvents) {
        const result = await simulateEvent(event);
        testResults = [...testResults, result];
      }
      dispatch('testcomplete', { results: testResults });
    }
  
    async function simulateEvent(event) {
      // Simulate event triggering and workflow execution
      const startTime = Date.now();
      let currentNode = findStartNode(event.type);
      const executionPath = [];
  
      while (currentNode) {
        executionPath.push({
          node: currentNode,
          timestamp: Date.now(),
          status: 'completed'
        });
        currentNode = getNextNode(currentNode);
      }
  
      return {
        event,
        duration: Date.now() - startTime,
        path: executionPath
      };
    }
  </script>
  
  <div class="p-4">
    <div class="flex justify-between mb-4">
      <h3 class="text-lg font-semibold">Workflow Testing</h3>
      <button 
        class="px-4 py-2 bg-blue-500 text-white rounded"
        on:click={runTest}
      >
        Run Test
      </button>
    </div>
  
    <div class="grid grid-cols-2 gap-4">
      <div>
        <h4 class="font-medium mb-2">Test Events</h4>
        {#each testEvents as event}
          <div class="bg-gray-100 p-2 rounded mb-2">
            <span>{event.type}</span>
            <button 
              class="ml-2 text-red-500"
              on:click={() => removeEvent(event)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
  
      <div>
        <h4 class="font-medium mb-2">Test Results</h4>
        {#each testResults as result}
          <div class="bg-gray-100 p-2 rounded mb-2">
            <div>Event: {result.event.type}</div>
            <div>Duration: {result.duration}ms</div>
            <div>Path: {result.path.map(p => p.node.id).join(' -> ')}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>