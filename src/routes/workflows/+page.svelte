
<script>
  //Main Navigation for Workflows
    import { page } from '$app/stores';
    import PencilIcon from 'lucide-svelte/icons/pencil';
    import Play from 'lucide-svelte/icons/play';
    import ClipboardList from 'lucide-svelte/icons/clipboard-list';
    import Webhook from 'lucide-svelte/icons/webhook';
    import Activity from 'lucide-svelte/icons/activity';
    import ChartBar from 'lucide-svelte/icons/chart-bar';
    import Cog from 'lucide-svelte/icons/cog';
    import Bell from 'lucide-svelte/icons/bell';
    
    let activeNotifications = 3;
    let currentWorkflow = null;
  
    const mainMenuItems = [
      {
        id: 'author',
        label: 'Author',
        icon: PencilIcon,
        path: '/workflows/author',
        description: 'Create and edit workflows'
      },
      {
        id: 'active',
        label: 'Active Workflows',
        icon: Activity,
        path: '/workflows/active',
        description: 'View and manage running workflows'
      },
      {
        id: 'test',
        label: 'Test & Debug',
        icon: Play,
        path: '/workflows/test',
        description: 'Test and debug workflows'
      },
      {
        id: 'webhooks',
        label: 'Webhooks',
        icon: Webhook,
        path: '/workflows/webhooks',
        description: 'Manage webhook endpoints'
      },
      {
        id: 'monitor',
        label: 'Monitor',
        icon: ChartBar,
        path: '/workflows/monitor',
        description: 'Monitor workflow performance'
      },
      {
        id: 'templates',
        label: 'Templates',
        icon: ClipboardList,
        path: '/workflows/templates',
        description: 'Manage workflow templates'
      }
    ];
  </script>
  
  <div class="bg-white shadow">
    <!-- Top Bar -->
    <div class="border-b px-4 py-2 flex items-center justify-between">
      <div class="flex items-center space-x-4">
       Workflow Manager<br>
        
        {#if currentWorkflow}
          <div class="flex items-center space-x-2 text-sm">
            <span class="text-gray-500">Current Workflow:</span>
            <span class="font-medium">{currentWorkflow.name}</span>
            <span class="px-2 py-0.5 rounded-full text-xs
              {currentWorkflow.status === 'active' ? 'bg-green-100 text-green-800' : 
               currentWorkflow.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
               'bg-gray-100 text-gray-800'}">
              {currentWorkflow.status}
            </span>
          </div>
        {/if}
      </div>
  
      <div class="flex items-center space-x-4">
        <!-- Notifications -->
        <button class="relative p-2 hover:bg-gray-100 rounded-full">
          <Bell class="w-5 h-5" />
          {#if activeNotifications > 0}
            <span class="absolute top-0 right-0 bg-red-500 text-white 
                       text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeNotifications}
            </span>
          {/if}
        </button>
  
        <!-- Settings -->
        <button class="p-2 hover:bg-gray-100 rounded-full">
          <Cog class="w-5 h-5" />
        </button>
      </div>
    </div>
  
    <!-- Main Navigation -->
    <nav class="px-4 py-2">
      <ul class="flex space-x-1">
        {#each mainMenuItems as item}
          <li>
            <a
              href={item.path}
              class="flex items-center px-3 py-2 rounded-md text-sm
                     {$page.url.pathname === item.path ? 
                       'bg-blue-50 text-blue-700' : 
                       'text-gray-700 hover:bg-gray-50'}"
              title={item.description}
            >
              <svelte:component this={item.icon} class="w-4 h-4 mr-2" />
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>