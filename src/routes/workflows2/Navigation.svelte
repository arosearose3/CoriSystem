<script>
    import { currentView } from './workflowstore.js';

    import  ListFilter  from 'lucide-svelte/icons/list-filter';
    import   Plus from 'lucide-svelte/icons/plus';

    const navItems = [
      { id: 'tasks', label: 'Tasks' },
      { id: 'events', label: 'Events' },
      { id: 'workflow-canvas', label: 'Workflow Canvas' },
      { id: 'workflows', label: 'Workflows' }
    ];
  </script>
  
  <nav class="bg-gray-800 text-white p-4">
    <div class="container mx-auto flex items-center justify-between">
      <div class="flex space-x-6">
        {#each navItems as item}
          <button
            class="px-3 py-2 rounded-md text-sm font-medium {$currentView === item.id ? 'bg-gray-900' : 'hover:bg-gray-700'}"
            on:click={() => currentView.set(item.id)}
          >
            {item.label}
          </button>
        {/each}
      </div>
    </div>
  </nav>