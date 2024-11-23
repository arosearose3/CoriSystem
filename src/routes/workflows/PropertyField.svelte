// components/properties/PropertyField.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import AlertCircle from 'lucide-svelte/icons/circle-alert';
    import Check from 'lucide-svelte/icons/check';
    import ChevronDown from 'lucide-svelte/icons/chevron-down';
    import Plus from 'lucide-svelte/icons/plus';
    import X from 'lucide-svelte/icons/x';
  
  const dispatch = createEventDispatcher();

  export let key;
  export let type = 'text';  // text, number, select, boolean, json, array, schedule, expression
  export let label;
  export let value = '';
  export let options = [];
  export let description = '';
  export let required = false;
  export let validation = null;
  export let error = '';

  let isValid = true;
  let showValidation = false;


  // For array type
  let newItemValue = '';

  $: {
    if (validation) {
      isValid = validateField(value);
    }
  }

  function validateField(val) {
    if (required && !val) {
      error = 'This field is required';
      return false;
    }

    if (validation) {
      try {
        const result = validation(val);
        if (result !== true) {
          error = result;
          return false;
        }
      } catch (e) {
        error = e.message;
        return false;
      }
    }

    error = '';
    return true;
  }

  function handleChange(newValue) {
    value = newValue;
    if (validateField(newValue)) {
      dispatch('change', newValue);
    }
  }

  function handleArrayAdd() {
    if (newItemValue) {
      const newArray = [...(Array.isArray(value) ? value : []), newItemValue];
      handleChange(newArray);
      newItemValue = '';
    }
  }

  function handleArrayRemove(index) {
    const newArray = [...value];
    newArray.splice(index, 1);
    handleChange(newArray);
  }

  function formatJsonValue(val) {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return '';
    }
  }
</script>

<div class="mb-4">
  <div class="flex items-center justify-between mb-1">
    <label 
      for={key} 
      class="block text-sm font-medium text-gray-700"
    >
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
    
    {#if !isValid}
      <div 
        class="text-red-500 cursor-help"
        on:mouseenter={() => showValidation = true}
        on:mouseleave={() => showValidation = false}
      >
        <AlertCircle class="w-4 h-4" />
      </div>
    {/if}
  </div>

  {#if description}
    <p class="text-xs text-gray-500 mb-1">{description}</p>
  {/if}

  <!-- Different input types -->
  {#if type === 'text'}
    <input
      id={key}
      type="text"
      class="w-full px-3 py-2 border rounded-md shadow-sm
             focus:ring-blue-500 focus:border-blue-500
             {!isValid ? 'border-red-300' : 'border-gray-300'}"
      bind:value
      on:input={(e) => handleChange(e.target.value)}
    />

  {:else if type === 'number'}
    <input
      id={key}
      type="number"
      class="w-full px-3 py-2 border rounded-md shadow-sm
             focus:ring-blue-500 focus:border-blue-500
             {!isValid ? 'border-red-300' : 'border-gray-300'}"
      bind:value
      on:input={(e) => handleChange(Number(e.target.value))}
    />

  {:else if type === 'select'}
    <div class="relative">
      <select
        id={key}
        class="w-full px-3 py-2 border rounded-md shadow-sm
               appearance-none
               focus:ring-blue-500 focus:border-blue-500
               {!isValid ? 'border-red-300' : 'border-gray-300'}"
        bind:value
        on:change={(e) => handleChange(e.target.value)}
      >
        {#each options as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <ChevronDown class="w-4 h-4 absolute right-3 top-3 text-gray-400" />
    </div>

  {:else if type === 'boolean'}
    <div class="flex items-center">
      <input
        id={key}
        type="checkbox"
        class="h-4 w-4 text-blue-600 focus:ring-blue-500
               border-gray-300 rounded"
        checked={value}
        on:change={(e) => handleChange(e.target.checked)}
      />
      <label for={key} class="ml-2 text-sm text-gray-600">
        {value ? 'Enabled' : 'Disabled'}
      </label>
    </div>

  {:else if type === 'json'}
    <div class="relative">
      <textarea
        id={key}
        class="w-full px-3 py-2 border rounded-md shadow-sm font-mono text-sm
               focus:ring-blue-500 focus:border-blue-500
               {!isValid ? 'border-red-300' : 'border-gray-300'}"
        rows="4"
        value={formatJsonValue(value)}
        on:input={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            handleChange(parsed);
          } catch {
            error = 'Invalid JSON';
          }
        }}
      />
    </div>

  {:else if type === 'array'}
    <div class="space-y-2">
      {#if Array.isArray(value) && value.length > 0}
        {#each value as item, index}
          <div class="flex items-center space-x-2">
            <input
              type="text"
              class="flex-1 px-3 py-2 border rounded-md shadow-sm
                     focus:ring-blue-500 focus:border-blue-500
                     border-gray-300"
              value={item}
              readonly
            />
            <button
              class="text-red-500 hover:text-red-700"
              on:click={() => handleArrayRemove(index)}
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        {/each}
      {/if}
      
      <div class="flex items-center space-x-2">
        <input
          type="text"
          class="flex-1 px-3 py-2 border rounded-md shadow-sm
                 focus:ring-blue-500 focus:border-blue-500
                 border-gray-300"
          bind:value={newItemValue}
          placeholder="Add new item"
        />
        <button
          class="text-blue-500 hover:text-blue-700"
          on:click={handleArrayAdd}
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

  {:else if type === 'schedule'}
    <div class="space-y-2">
      <input
        id={key}
        type="text"
        class="w-full px-3 py-2 border rounded-md shadow-sm
               focus:ring-blue-500 focus:border-blue-500
               {!isValid ? 'border-red-300' : 'border-gray-300'}"
        placeholder="*/5 * * * *"
        bind:value
        on:input={(e) => handleChange(e.target.value)}
      />
      <p class="text-xs text-gray-500">
        Format: minute hour day month weekday
      </p>
    </div>

  {:else if type === 'expression'}
    <div class="space-y-2">
      <textarea
        id={key}
        class="w-full px-3 py-2 border rounded-md shadow-sm font-mono text-sm
               focus:ring-blue-500 focus:border-blue-500
               {!isValid ? 'border-red-300' : 'border-gray-300'}"
        rows="3"
        bind:value
        on:input={(e) => handleChange(e.target.value)}
      />
      <p class="text-xs text-gray-500">
        Enter a valid expression
      </p>
    </div>
  {/if}

  {#if error && showValidation}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>