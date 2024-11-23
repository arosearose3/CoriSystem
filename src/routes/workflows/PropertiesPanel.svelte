<script>
    import { createEventDispatcher } from 'svelte';
    import PropertyField from './PropertyField.svelte';
    
    export let element = null;
    
    const dispatch = createEventDispatcher();
    
    function updateProperty(key, value) {
      dispatch('update', {
        element,
        changes: { [key]: value }
      });
    }
  
    $: properties = element ? getPropertiesForType(element.type) : [];
  
    function getPropertiesForType(type) {
    switch (type) {
      case 'webhook':
        return [
          { key: 'url', type: 'text', label: 'Webhook URL' },
          { key: 'method', type: 'select', label: 'HTTP Method', options: [{ value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }] },
        ];
      case 'timer':
        return [
          { key: 'schedule', type: 'text', label: 'Schedule' },
          { key: 'repeat', type: 'boolean', label: 'Repeat' },
        ];
      // ... other types
      default:
        return [];
    }
  }
  </script>
  
  <div class="h-full p-4 bg-gray-50">
    {#if element}
      <h3 class="text-lg font-semibold mb-4">{element.type} Properties</h3>
      
      {#each properties as prop}
        <PropertyField
          key={prop.key}
          type={prop.type}
          label={prop.label}
          value={element[prop.key] ?? ''}
          options={prop.options}
          on:change={e => updateProperty(prop.key, e.detail)}
        />
      {/each}
    {:else}
      <p class="text-gray-500">Select an element to view properties</p>
    {/if}
  </div>