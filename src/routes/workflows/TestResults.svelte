<script>
    import { 
      CheckCircle2, 
      XCircle,
      Clock,
      ArrowRight,
      ChevronDown,
      ChevronUp 
    } from 'lucide-svelte';
    
    export let testResults = [];
    
    let expandedResults = new Set();
  
    function toggleExpand(id) {
      if (expandedResults.has(id)) {
        expandedResults.delete(id);
      } else {
        expandedResults.add(id);
      }
      expandedResults = expandedResults; // trigger reactivity
    }
  
    function formatDuration(ms) {
      return ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(2)}s`;
    }
  
    function getStatusColor(status) {
      return {
        completed: 'text-green-500',
        error: 'text-red-500',
        pending: 'text-yellow-500'
      }[status] || 'text-gray-500';
    }
  </script>
  
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-4">Test Results</h2>
  
    {#if testResults.length === 0}
      <div class="text-center text-gray-500 py-8">
        <Clock class="w-8 h-8 mx-auto mb-2" />
        <p>No test results yet</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each testResults as result}
          <div class="border rounded">
            <div 
              class="p-3 flex items-center justify-between cursor-pointer"
              on:click={() => toggleExpand(result.id)}
            >
              <div class="flex items-center">
                {#if result.status === 'completed'}
                  <CheckCircle2 class="w-5 h-5 text-green-500 mr-2" />
                {:else if result.status === 'error'}
                  <XCircle class="w-5 h-5 text-red-500 mr-2" />
                {:else}
                  <Clock class="w-5 h-5 text-yellow-500 mr-2" />
                {/if}
  
                <div>
                  <div class="font-medium">{result.type}</div>
                  <div class="text-sm text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
  
              <div class="flex items-center">
                <span class="text-sm mr-2">
                  {formatDuration(result.duration)}
                </span>
                {#if expandedResults.has(result.id)}
                  <ChevronUp class="w-4 h-4" />
                {:else}
                  <ChevronDown class="w-4 h-4" />
                {/if}
              </div>
            </div>
  
            {#if expandedResults.has(result.id)}
              <div class="border-t p-3">
                <div class="space-y-2">
                  {#if result.details}
                    <pre class="bg-gray-50 p-2 rounded text-sm overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  {/if}
  
                  {#if result.error}
                    <div class="bg-red-50 text-red-700 p-2 rounded text-sm">
                      {result.error}
                    </div>
                  {/if}
  
                  {#if result.steps}
                    <div class="space-y-1">
                      {#each result.steps as step}
                        <div class="flex items-center text-sm">
                          <ArrowRight class="w-4 h-4 mr-1" />
                          <span class={getStatusColor(step.status)}>
                            {step.name}
                          </span>
                          <span class="text-gray-500 ml-2">
                            {formatDuration(step.duration)}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
  
      <div class="mt-4 pt-4 border-t">
        <div class="flex justify-between text-sm text-gray-500">
          <span>Total Tests: {testResults.length}</span>
          <span>
            Total Time: {formatDuration(testResults.reduce((acc, curr) => acc + curr.duration, 0))}
          </span>
        </div>
      </div>
    {/if}
  </div>