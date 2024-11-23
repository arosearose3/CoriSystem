<script>
  import { slide } from 'svelte/transition';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';

  export let name = '';
  export let description = '';

  let isExpanded = true;

  function toggleExpand() {
    isExpanded = !isExpanded;
  }
</script>

<div class="mb-4 bg-white rounded-lg shadow-sm border border-gray-200"  draggable="false">
  <div 
    class="p-2 cursor-pointer hover:bg-gray-50 flex items-center"
    on:click={toggleExpand}
  >
    <button 
      class="text-gray-500 hover:text-gray-700 mr-2"
      aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
    >
      {#if isExpanded}
        <ChevronDown class="w-4 h-4" />
      {:else}
        <ChevronRight class="w-4 h-4" />
      {/if}
    </button>

    <span class="font-medium text-sm text-gray-800">
      {name} - {description}
    </span>
  </div>

  {#if isExpanded}
    <div class="p-2 space-y-1 border-t border-gray-100" transition:slide>
      <slot />
    </div>
  {/if}
</div>