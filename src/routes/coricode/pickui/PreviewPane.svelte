<script>
    export let fields = [];
  
    function formatJson(data) {
      return JSON.stringify(data, null, 2);
    }
  </script>
  
  <div class="bg-gray-50 p-4 rounded-lg border mb-6">
    <h2 class="text-lg font-medium text-gray-900 mb-3">Template Structure</h2>
    <pre class="bg-white p-4 rounded border overflow-auto text-sm font-mono text-gray-700">{formatJson(fields)}</pre>
  </div>