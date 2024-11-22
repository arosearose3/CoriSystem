// routes/workflows/monitor/+page.svelte
<script>
  import { onMount } from 'svelte';
  import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip 
  } from 'recharts';

  let metrics = {
    activeWorkflows: 0,
    completedToday: 0,
    averageRuntime: 0,
    errorRate: 0
  };

  let timeSeriesData = [];

  onMount(async () => {
    metrics = await fetchMetrics();
    timeSeriesData = await fetchTimeSeriesData();
  });
</script>

<div class="p-4">
  <div class="grid grid-cols-4 gap-4 mb-4">
    <div class="bg-white shadow rounded p-4">
      <h3 class="text-sm text-gray-500">Active Workflows</h3>
      <p class="text-2xl font-semibold">{metrics.activeWorkflows}</p>
    </div>
    
    <div class="bg-white shadow rounded p-4">
      <h3 class="text-sm text-gray-500">Completed Today</h3>
      <p class="text-2xl font-semibold">{metrics.completedToday}</p>
    </div>
    
    <div class="bg-white shadow rounded p-4">
      <h3 class="text-sm text-gray-500">Avg Runtime</h3>
      <p class="text-2xl font-semibold">{metrics.averageRuntime}s</p>
    </div>
    
    <div class="bg-white shadow rounded p-4">
      <h3 class="text-sm text-gray-500">Error Rate</h3>
      <p class="text-2xl font-semibold">{metrics.errorRate}%</p>
    </div>
  </div>

  <div class="bg-white shadow rounded p-4">
    <h2 class="text-lg font-semibold mb-4">Workflow Activity</h2>
    <LineChart width={800} height={300} data={timeSeriesData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="active" stroke="#8884d8" />
      <Line type="monotone" dataKey="completed" stroke="#82ca9d" />
    </LineChart>
  </div>
</div>