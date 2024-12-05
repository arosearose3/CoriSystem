<script>
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  export let cond;
  export let showLogicOperator = false;
  export let availableActivities = [];
  export let CONTEXT_SOURCES = [];
  export let OPERATORS = [];
  export let LOGIC_OPERATORS = [];
  
  let filteredPaths = [];
  let showSuggestions = false;
  let selectedIndex = 0;
  
  $: availablePaths = getAvailablePaths(cond.source, cond.activityName);
  
  function getAvailablePaths(source, activityName = '') {
    const dataStructure = CONTEXT_SOURCES.find((s) => s.id === source);
    if (!dataStructure) return [];
    const paths = dataStructure.paths || [];
    if (source === 'previousTask' && activityName) {
      return paths.map((p) => ({
        ...p,
        path: p.path.replace('%activityName%', activityName)
      }));
    }
    return paths;
  }
  
  function handlePathInput(event) {
    const input = event.target.value.toLowerCase();
    filteredPaths = availablePaths.filter(
      (p) => p.path.toLowerCase().includes(input) || 
      p.description.toLowerCase().includes(input)
    );
    showSuggestions = filteredPaths.length > 0;
    selectedIndex = 0;
  }
  
  function selectPath(path) {
    cond.propertyPath = path;
    showSuggestions = false;
    dispatch('change');
  }
  
  function getPathDataType(source, path) {
    const dataStructure = CONTEXT_SOURCES.find((s) => s.id === source);
    const pathInfo = dataStructure?.paths.find((p) => p.path === path);
    return pathInfo?.type || 'string';
  }
  
  function validateInput(path) {
    return /^[a-zA-Z0-9.[\]]+$/.test(path);
  }

  function handleRemove() {
    dispatch('remove');
  }

  function handleChange() {
    dispatch('change');
  }
</script>

<div class="condition-group">
  {#if showLogicOperator}
    <div class="form-group">
      <label class="label">Logic Operator</label>
      <select
        class="select"
        bind:value={cond.logicOperator}
        on:change={handleChange}
      >
        {#each LOGIC_OPERATORS as op}
          <option value={op.id}>{op.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="form-group">
    <label class="label">Data Source</label>
    <select
      class="select"
      bind:value={cond.source}
      on:change={handleChange}
    >
      {#each CONTEXT_SOURCES as source}
        <option value={source.id}>{source.label}</option>
      {/each}
    </select>
  </div>

  {#if cond.source === 'previousTask'}
    <div class="form-group">
      <label class="label">Select Activity</label>
      <select
        class="select"
        bind:value={cond.activityName}
        on:change={handleChange}
      >
        <option value="">Select an activity...</option>
        {#each availableActivities as activity}
          <option value={activity.name}>{activity.title}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="form-group">
    <label class="label">Property Path</label>
    <div class="input-wrapper">
      <input
        type="text"
        class="input"
        bind:value={cond.propertyPath}
        on:input={handlePathInput}
        placeholder="Start typing for suggestions..."
      />
      {#if showSuggestions}
        <div class="suggestions">
          {#each filteredPaths as path, i}
            <div
              class="suggestion-item"
              class:selected={i === selectedIndex}
              on:click={() => selectPath(path.path)}
            >
              <div class="suggestion-path">{path.path}</div>
              <div class="suggestion-description">{path.description}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="form-group">
    <label class="label">Operator</label>
    <select
      class="select"
      bind:value={cond.operator}
      on:change={handleChange}
    >
      {#each OPERATORS as op}
        <option value={op}>{op.label}</option>
      {/each}
    </select>
  </div>

  {#if !['empty', 'exists'].includes(cond.operator?.id)}
    <div class="form-group">
      <label class="label">Compare Value</label>
      <input
        type="text"
        class="input"
        bind:value={cond.compareValue}
        on:input={handleChange}
        placeholder="Value to compare against"
      />
    </div>
  {/if}

  <button
    class="remove-button"
    on:click={handleRemove}
    aria-label="Remove condition"
  >
    <Trash2 size={16} />
  </button>
</div>

<style>
  .condition-group {
    position: relative;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: #374151;
  }

  .select, .input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .input-wrapper {
    position: relative;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-height: 12rem;
    overflow-y: auto;
    z-index: 50;
  }

  .suggestion-item {
    padding: 0.5rem;
    cursor: pointer;
  }

  .suggestion-item:hover, .suggestion-item.selected {
    background-color: #f3f4f6;
  }

  .suggestion-path {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .suggestion-description {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .remove-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: #6b7280;
    padding: 0.25rem;
    border-radius: 0.25rem;
    line-height: 0;
  }

  .remove-button:hover {
    color: #ef4444;
    background: #fee2e2;
  }

  .select:focus, .input:focus {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .select:disabled, .input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .input.error {
    border-color: #ef4444;
  }

  .suggestion-item {
    transition: background-color 150ms ease;
  }

  .remove-button {
    transition: color 150ms ease, background-color 150ms ease;
  }
</style>