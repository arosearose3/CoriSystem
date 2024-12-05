<script>
    // Example data structure
    const examples = [
      {
        title: 'Basic Comparison',
        code: [
          { type: 'path', value: 'context.user.email' },
          { type: 'operator', value: 'eq' },
          { type: 'value', value: "'user@example.com'" }
        ]
      },
      {
        title: 'Array Check',
        code: [
          { type: 'path', value: 'context.practitioner.roles' },
          { type: 'operator', value: '.contains(' },
          { type: 'value', value: "'admin'" },
          { type: 'operator', value: ')' }
        ]
      },
      {
        title: 'Multiple Conditions',
        code: [
          { type: 'path', value: 'context.user.name' },
          { type: 'operator', value: 'exists()' },
          { type: 'logic', value: 'and' },
          { type: 'path', value: 'context.practitioner.npi' },
          { type: 'operator', value: 'exists()' }
        ]
      },
      {
        title: 'Date Range Check',
        code: [
          { type: 'path', value: 'system.timestamp' },
          { type: 'operator', value: 'ge' },
          { type: 'value', value: "'2024-01-01T00:00:00'" },
          { type: 'logic', value: 'and' },
          { type: 'path', value: 'system.timestamp' },
          { type: 'operator', value: 'le' },
          { type: 'value', value: "'2024-12-31T23:59:59'" }
        ]
      },
      {
        title: 'Array Filter',
        code: [
          { type: 'path', value: 'event.data.items' },
          { type: 'operator', value: '.where(' },
          { type: 'path', value: 'status' },
          { type: 'operator', value: 'eq' },
          { type: 'value', value: "'active'" },
          { type: 'operator', value: ')' },
          { type: 'operator', value: '.exists()' }
        ]
      },
      {
        title: 'Nested Property Access',
        code: [
          { type: 'path', value: 'event.data.patient.type.coding' },
          { type: 'operator', value: '.where(' },
          { type: 'path', value: 'system' },
          { type: 'operator', value: 'eq' },
          { type: 'value', value: "'http://terminology.hl7.org/CodeSystem/v2-0004'" },
          { type: 'operator', value: ')' },
          { type: 'operator', value: '.exists()' }
        ]
      },
      {
        title: 'Activity Result Check',
        code: [
          { type: 'path', value: 'activity.sendEmail.outputs.status' },
          { type: 'operator', value: 'eq' },
          { type: 'value', value: "'completed'" },
          { type: 'logic', value: 'and' },
          { type: 'path', value: 'activity.sendEmail.outputs.error' },
          { type: 'operator', value: '.empty()' }
        ]
      },
      {
        title: 'Complex Multi-condition',
        code: [
          { type: 'logic', value: '(' },
          { type: 'path', value: 'context.practitioner.roles' },
          { type: 'operator', value: '.contains(' },
          { type: 'value', value: "'admin'" },
          { type: 'operator', value: ')' },
          { type: 'logic', value: 'or' },
          { type: 'path', value: 'context.practitioner.roles' },
          { type: 'operator', value: '.contains(' },
          { type: 'value', value: "'supervisor'" },
          { type: 'operator', value: ')' },
          { type: 'logic', value: ')' },
          { type: 'logic', value: 'and' },
          { type: 'path', value: 'event.data.priority' },
          { type: 'operator', value: 'eq' },
          { type: 'value', value: "'high'" }
        ]
      },
      {
        title: 'Function Usage',
        code: [
          { type: 'path', value: 'event.data.observations' },
          { type: 'operator', value: '.where(' },
          { type: 'path', value: 'value' },
          { type: 'operator', value: 'gt' },
          { type: 'value', value: '100' },
          { type: 'operator', value: ')' },
          { type: 'operator', value: '.count()' },
          { type: 'operator', value: 'gt' },
          { type: 'value', value: '2' }
        ]
      }
    ];
  
    function getTokenClass(type) {
      switch (type) {
        case 'path':
          return 'text-blue-600';
        case 'operator':
          return 'text-gray-600';
        case 'value':
          return 'text-green-600';
        case 'logic':
          return 'text-purple-600';
        default:
          return '';
      }
    }
  </script>
  
  <div class="mt-8 p-6 bg-gray-50 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">FHIRPath Expression Examples</h3>
    
    <div class="space-y-4 font-mono text-sm">
      {#each examples as example}
        <div class="example-group">
          <div class="text-gray-500 text-xs mb-1">{example.title}:</div>
          <div class="bg-white p-3 rounded border shadow-sm">
            <code class="flex flex-wrap items-center gap-2">
              {#each example.code as token}
                <span class={getTokenClass(token.type)}>
                  {token.value}
                </span>
              {/each}
            </code>
          </div>
        </div>
      {/each}
    </div>
  </div>
  
  <style>
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  
    .example-group {
      transition: transform 0.1s ease-in-out;
    }
  
    .example-group:hover {
      transform: translateX(4px);
    }
  
    .example-group code {
      white-space: pre-wrap;
      word-break: break-word;
    }
  
    /* Tailwind classes */
    :global(.text-blue-600) { color: #2563eb; }
    :global(.text-gray-600) { color: #4b5563; }
    :global(.text-green-600) { color: #059669; }
    :global(.text-purple-600) { color: #9333ea; }
    
    .shadow-sm {
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
  </style>