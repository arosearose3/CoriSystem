<script>
    export let section = null;
    
    const subMenus = {
      author: [
        { id: 'new', label: 'New Workflow', path: '/workflows/author/new' },
        { id: 'edit', label: 'Edit Existing', path: '/workflows/author/edit' },
        { id: 'import', label: 'Import', path: '/workflows/author/import' }
      ],
      active: [
        { id: 'running', label: 'Running', path: '/workflows/active/running' },
        { id: 'paused', label: 'Paused', path: '/workflows/active/paused' },
        { id: 'completed', label: 'Completed', path: '/workflows/active/completed' }
      ],
      test: [
        { id: 'simulator', label: 'Simulator', path: '/workflows/test/simulator' },
        { id: 'debugger', label: 'Debugger', path: '/workflows/test/debugger' },
        { id: 'logs', label: 'Logs', path: '/workflows/test/logs' }
      ],
      webhooks: [
        { id: 'endpoints', label: 'Endpoints', path: '/workflows/webhooks/endpoints' },
        { id: 'history', label: 'History', path: '/workflows/webhooks/history' },
        { id: 'test', label: 'Test Endpoint', path: '/workflows/webhooks/test' }
      ],
      monitor: [
        { id: 'dashboard', label: 'Dashboard', path: '/workflows/monitor/dashboard' },
        { id: 'performance', label: 'Performance', path: '/workflows/monitor/performance' },
        { id: 'alerts', label: 'Alerts', path: '/workflows/monitor/alerts' }
      ],
      templates: [
        { id: 'browse', label: 'Browse', path: '/workflows/templates/browse' },
        { id: 'create', label: 'Create New', path: '/workflows/templates/create' },
        { id: 'categories', label: 'Categories', path: '/workflows/templates/categories' }
      ]
    };
  
    $: currentSubMenu = subMenus[section] || [];
  </script>
  
  {#if currentSubMenu.length > 0}
    <div class="bg-gray-50 px-4 py-2 border-b">
      <nav>
        <ul class="flex space-x-4">
          {#each currentSubMenu as item}
            <li>
              <a
                href={item.path}
                class="text-sm {$page.url.pathname === item.path ? 
                  'text-blue-700 font-medium' : 
                  'text-gray-600 hover:text-gray-900'}"
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  {/if}