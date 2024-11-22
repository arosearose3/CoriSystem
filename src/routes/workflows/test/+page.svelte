// routes/workflows/test/+page.svelte
<script>
  import { Play, Bug, List } from 'lucide-svelte';
  import WorkflowSimulator from '../WorkflowSimulator.svelte';
  import TestResults from '../TestResults.svelte';

  let currentTest = null;
  let testResults = [];

  async function runTest(config) {
    currentTest = config;
    const results = await simulateWorkflow(config);
    testResults = [...testResults, results];
  }
</script>

<div class="grid grid-cols-2 gap-4 p-4">
  <div class="bg-white shadow rounded p-4">
    <WorkflowSimulator 
      on:run={({ detail }) => runTest(detail)}
    />
  </div>

  <div class="bg-white shadow rounded p-4">
    <TestResults {testResults} />
  </div>
</div>