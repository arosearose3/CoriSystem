// components/palette/ActivityGroup.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import { ChevronDown, ChevronRight } from 'lucide-svelte';
  
  const dispatch = createEventDispatcher();

  export let name;
  export let description = '';
  export let icon = null;
  
  let isExpanded = true;
  let isDragging = false;

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  // Handle drag interactions for the entire group
  function handleDragStart(event) {
    isDragging = true;
    dispatch('dragstart', { group: name, event });
  }

  function handleDragEnd() {
    isDragging = false;
    dispatch('dragend');
  }
</script>

<div 
  class="mb-4 bg-white rounded-lg shadow-sm border border-gray-200"
  class:dragging={isDragging}
>
  <!-- Group Header -->
  <div 
    class="flex items-center p-2 cursor-pointer hover:bg-gray-50"
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

    <div class="flex-1">
      <div class="flex items-center">
        {#if icon}
          <svelte:component this={icon} class="w-4 h-4 mr-2 text-gray-500" />
        {/if}
        <h3 class="font-medium text-sm">{name}</h3>
      </div>
      {#if description}
        <p class="text-xs text-gray-500">{description}</p>
      {/if}
    </div>
  </div>

  <!-- Group Content -->
  {#if isExpanded}
    <div 
      class="p-2 space-y-1 border-t border-gray-100"
      class:opacity-50={isDragging}
      transition:slide
    >
      <slot />
    </div>
  {/if}
</div>

<!-- Activity Item Template (for consistent styling) -->
<div class="hidden">
  <!-- This serves as a template for activity items -->
  <div class="activity-item-template flex items-center p-2 rounded-md hover:bg-gray-50 cursor-move">
    <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
      <!-- Icon placeholder -->
    </div>
    <div>
      <div class="font-medium text-sm">Activity Name</div>
      <div class="text-xs text-gray-500">Description</div>
    </div>
  </div>
</div>

<style>
  .dragging {
    opacity: 0.7;
    transform: scale(0.98);
    transition: all 0.2s ease;
  }

  /* Animation for expand/collapse */
  .slide-enter {
    opacity: 0;
    transform: translateY(-10px);
  }

  .slide-enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: all 0.2s ease;
  }

  .slide-exit {
    opacity: 1;
    transform: translateY(0);
  }

  .slide-exit-active {
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.2s ease;
  }

  /* Activity item hover effects */
  :global(.activity-item:hover) {
    background-color: theme('colors.gray.50');
    transform: translateX(2px);
    transition: all 0.2s ease;
  }

  /* Custom scrollbar for the content area */
  :global(.activity-group-content) {
    scrollbar-width: thin;
    scrollbar-color: theme('colors.gray.300') theme('colors.gray.100');
  }

  :global(.activity-group-content::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.activity-group-content::-webkit-scrollbar-track) {
    background: theme('colors.gray.100');
  }

  :global(.activity-group-content::-webkit-scrollbar-thumb) {
    background-color: theme('colors.gray.300');
    border-radius: 3px;
  }
</style>