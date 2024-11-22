<script>
    import { AlertCircle, CheckCircle } from 'lucide-svelte';
    
    export let node;
    export let showDetails = false;
  
    $: validationResult = validateNode(node);
    $: isValid = validationResult.errors.length === 0;
  
    function validateNode(node) {
      const errors = [];
      const warnings = [];
  
      switch (node.type) {
        case 'webhook':
          if (!node.data?.url) {
            errors.push('Webhook URL is required');
          } else if (!isValidUrl(node.data.url)) {
            errors.push('Invalid webhook URL format');
          }
          break;
  
        case 'timer':
          if (!node.data?.schedule) {
            errors.push('Schedule is required');
          } else if (!isValidCron(node.data.schedule)) {
            errors.push('Invalid cron schedule format');
          }
          break;
  
        case 'condition':
          if (!node.data?.expression) {
            errors.push('Condition expression is required');
          }
          break;
      }
  
      return { isValid: errors.length === 0, errors, warnings };
    }
  </script>
  
  <div class="absolute top-0 right-0 -mt-2 -mr-2">
    {#if isValid}
      <div class="bg-green-500 rounded-full p-1" title="Valid configuration">
        <CheckCircle class="w-4 h-4 text-white" />
      </div>
    {:else}
      <div 
        class="bg-red-500 rounded-full p-1 cursor-help"
        on:mouseenter={() => showDetails = true}
        on:mouseleave={() => showDetails = false}
      >
        <AlertCircle class="w-4 h-4 text-white" />
      </div>
    {/if}
  
    {#if showDetails && !isValid}
      <div 
        class="absolute top-full mt-2 right-0 w-48 bg-white rounded shadow-lg p-2
               border text-sm"
      >
        <ul class="list-disc list-inside text-red-600">
          {#each validationResult.errors as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>