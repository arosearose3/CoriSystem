<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { slide } from 'svelte/transition';

  import { workflowStore, updateNodeCondition } from '../workflowstore.js';


  import ConditionRow from './ConditionRow.svelte';
  import FileText from 'lucide-svelte/icons/file-text';
  import Mail from 'lucide-svelte/icons/mail';
  import Calendar from 'lucide-svelte/icons/calendar';
  import Hash from 'lucide-svelte/icons/hash';
  import Users from 'lucide-svelte/icons/users';
  import Clock from 'lucide-svelte/icons/clock';
  import Database from 'lucide-svelte/icons/database';
  import Key from 'lucide-svelte/icons/key';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import PlusCircle from 'lucide-svelte/icons/circle-plus';
  import X from 'lucide-svelte/icons/x';
  import Trash2 from 'lucide-svelte/icons/trash-2';
 

  let selectedNode;
  $: selectedNode = $workflowStore?.nodes?.find(n => n.id === $workflowStore.selectedNode);

  export let onClose = () => {}; 

  let storeInitialized = false;
onMount(() => {
  storeInitialized = true;
});

// Modify the close button handler
function handleClose() {
  onClose();
}

  // Available data structures for properties
  const DATA_STRUCTURES = {
    previousTask: {
      label: 'Previous Activity Output',
      prefix: 'activity',
      paths: [
        { path: '%activityName%.outputs.result', description: 'Activity result value', type: 'string' },
        { path: '%activityName%.outputs.status', description: 'Activity status', type: 'string' },
        { path: '%activityName%.outputs.error', description: 'Error information if failed', type: 'string' }
      ]
    },
    context: {
      label: 'User Context',
      prefix: 'context',
      paths: [
        { path: 'user.email', description: 'User email address', type: 'string' },
        { path: 'user.name', description: 'User full name', type: 'string' },
        { path: 'user.id', description: 'User ID', type: 'string' },
        { path: 'practitioner.roles', description: 'User roles array', type: 'string[]' },
        { path: 'practitioner.organizationName', description: 'Organization name', type: 'string' },
        { path: 'practitioner.npi', description: 'National Provider ID', type: 'string' }
      ]
    },
    system: {
      label: 'System Variables',
      prefix: 'system',
      paths: [
        { path: 'timestamp', description: 'Current time', type: 'datetime' },
        { path: 'environment', description: 'Runtime environment', type: 'string' }
      ]
    },
    event: {
      label: 'Event Data',
      prefix: 'event',
      paths: [
        { path: 'data', description: 'Event payload', type: 'object' },
        { path: 'type', description: 'Event type', type: 'string' },
        { path: 'timestamp', description: 'Event timestamp', type: 'datetime' }
      ]
    }
  };

  const OPERATORS = [
    { id: 'eq', label: '=', forTypes: ['string', 'number', 'date', 'datetime'] },
    { id: 'ne', label: '≠', forTypes: ['string', 'number', 'date', 'datetime'] },
    { id: 'gt', label: '>', forTypes: ['number', 'date', 'datetime'] },
    { id: 'lt', label: '<', forTypes: ['number', 'date', 'datetime'] },
    { id: 'ge', label: '≥', forTypes: ['number', 'date', 'datetime'] },
    { id: 'le', label: '≤', forTypes: ['number', 'date', 'datetime'] },
    { id: 'contains', label: 'contains', forTypes: ['string', 'string[]'] },
    { id: 'empty', label: 'is empty', forTypes: ['string', 'string[]'] },
    { id: 'exists', label: 'exists', forTypes: ['string', 'string[]'] }
  ];

  const LOGIC_OPERATORS = [
    { id: 'and', label: 'AND' },
    { id: 'or', label: 'OR' }
  ];

  const TYPE_ICONS = {
      string: FileText,
      email: Mail,
      date: Calendar,
      datetime: Clock,
      'string[]': Users,
      object: Database,
      id: Key,
      number: Hash
    };

  // Create CONTEXT_SOURCES from DATA_STRUCTURES
  const CONTEXT_SOURCES = Object.entries(DATA_STRUCTURES).map(([id, data]) => ({
    id,
    label: data.label,
    prefix: data.prefix,
    paths: data.paths
  }));

  export let condition = '';
  export let availableActivities = [];

  const dispatch = createEventDispatcher();

  let panelWidth = 400;
  let isResizing = false;
  let panelEl;

  function startResize(event) {
    isResizing = true;
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  }

  function handleResize(event) {
    if (!isResizing) return;
    const newWidth = window.innerWidth - event.clientX;
    // Limit min/max width
    panelWidth = Math.min(Math.max(newWidth, 300), 800);
    panelEl.style.width = `${panelWidth}px`;
  }

  function stopResize() {
    isResizing = false;
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
  }

  function handleSave() {
  if (!selectedNode) {
    console.error('No node selected');
    return;
  }
  
  buildExpression();
  
  try {
    // Update the node using the store's method
    workflowStore.updateNodeCondition(selectedNode.id, condition);
    
    // Notify parent components
    dispatch('change', { condition });
    onClose();
  } catch (error) {
    console.error('Failed to save condition:', error);
  }
}

  // Simple toast notification
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Track expanded sections
  let expandedSections = Object.keys(DATA_STRUCTURES).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});

  // Track conditions
  let conditions = [{
    source: 'context',
    propertyPath: '',
    operator: OPERATORS[0],
    compareValue: '',
    logicOperator: 'and'
  }];

  // Track recently inserted path
  let recentlyInserted = null;

  function toggleSection(sourceKey) {
    expandedSections = {
      ...expandedSections,
      [sourceKey]: !expandedSections[sourceKey]
    };
  }

  function addCondition() {
    conditions = [...conditions, {
      source: 'context',
      propertyPath: '',
      operator: OPERATORS[0],
      compareValue: '',
      logicOperator: 'and'
    }];
  }

  function removeCondition(index) {
    if (conditions.length > 1) {
      conditions = conditions.filter((_, i) => i !== index);
      buildExpression();
    }
  }

  function handlePathClick(source, path) {
  if (conditions.length > 0) {
    conditions[conditions.length - 1].source = source;
    conditions[conditions.length - 1].propertyPath = path;
    conditions = [...conditions];
    buildExpression();
  }
}

function buildExpression() {
  if (!storeInitialized || !selectedNode) {
    console.warn('Store not ready or no node selected');
    return;
  }

  if (conditions.length === 0) {
    condition = '';
    return;
  }

  // First build the condition string
  condition = conditions
    .map((cond, i) => {
      const prefix = DATA_STRUCTURES[cond.source]?.prefix || '';
      const expr = `${prefix}.${cond.propertyPath}`;
      const operator = buildOperatorExpression(expr, cond);
      return i === 0 ? operator : `${cond.logicOperator} ${operator}`;
    })
    .join(' ');

  // Use the method directly from the store
  workflowStore.updateNodeCondition(selectedNode.id, condition);
}

  function buildOperatorExpression(expr, cond) {
    if (!cond.propertyPath) return '';
    
    const type = getPathDataType(cond.source, cond.propertyPath);
    const value = formatValue(cond.compareValue, type);
    
    switch (cond.operator.id) {
      case 'empty':
        return `${expr}.empty()`;
      case 'exists':
        return `${expr}.exists()`;
      case 'contains':
        return `${expr}.contains(${value})`;
      default:
        return `${expr} ${cond.operator.id} ${value}`;
    }
  }

  function getPathDataType(source, path) {
    const sourceData = DATA_STRUCTURES[source];
    const pathInfo = sourceData?.paths.find(p => p.path === path);
    return pathInfo?.type || 'string';
  }

  function formatValue(value, type) {
    if (!value) return "''";
    if (['string', 'datetime', 'date'].includes(type)) {
      return `'${value}'`;
    }
    return value;
  }
</script>

<div 
  class="condition-panel"
  bind:this={panelEl}
  transition:slide={{ duration: 300, axis: 'x' }}
>
  <!-- Panel Header -->
  <div class="panel-header">
    <h3>Edit Condition</h3>
    <div class="panel-actions">
      <button 
        class="btn btn-primary save-btn"
        on:click={handleSave}
      >
        Save Changes
      </button>
      <button 
      class="close-btn"
      on:click={handleClose}
    >
      <X size={16} />
    </button>
    </div>
  </div>

  <!-- Resize Handle -->
  <div 
    class="resize-handle"
    on:mousedown={startResize}
  ></div>

  <!-- Panel Content with Scroll -->
  <div class="panel-content">
    <!-- Two-Column Layout -->
    <div class="panel-layout">
      <!-- Property Path Reference Panel -->
      <div class="sidebar">
        <div class="sections">
          {#each Object.entries(DATA_STRUCTURES) as [sourceKey, sourceData]}
            <div class="section">
              <button 
                class="section-header"
                on:click={() => toggleSection(sourceKey)}
              >
                <span class="section-title">{sourceData.label}</span>
                <div class="chevron" class:rotate90={expandedSections[sourceKey]}>
                  <ChevronRight size={16} />
                </div>
              </button>

              {#if expandedSections[sourceKey]}
                <div transition:slide={{duration: 200}}>
                  <ul class="path-list">
                    {#each sourceData.paths as pathData}
                      <li 
                        class="path-item"
                        class:inserted={recentlyInserted === pathData.path}
                        on:click={() => handlePathClick(sourceKey, pathData.path)}
                        title={`Type: ${pathData.type}\nDescription: ${pathData.description}`}
                      >
                        <div class="icon-container">
                          <svelte:component
                            this={TYPE_ICONS[pathData.type] || FileText}
                            size={12}
                          />
                        </div>
                        <div class="path-content">
                          <code class="path-code"
                            class:highlight={recentlyInserted === pathData.path}
                          >
                            {pathData.path}
                          </code>
                          <div class="path-description">{pathData.description}</div>
                        </div>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Main Builder Area -->
      <div class="builder-area">
        <div class="header">
          <button class="add-button" on:click={addCondition}>
            <PlusCircle size={16} />
            Add Condition
          </button>
        </div>

        <div class="conditions-container">
          {#each conditions as cond, index}
          <ConditionRow
          {cond}
          {availableActivities}
          {CONTEXT_SOURCES}
          {OPERATORS}
          {LOGIC_OPERATORS}
          showLogicOperator={index > 0}
          on:change={() => {
            if (selectedNode) {
              buildExpression();
            }
          }}
          on:remove={() => removeCondition(index)}
        />
          {/each}

          <div class="preview">
            <label class="label">FHIRPath Expression:</label>
            <code class="expression">{condition || 'No condition set'}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

  
  <style>
      .condition-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px; /* Initial width */
    height: 100vh;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .panel-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
  }

  .resize-handle:hover {
    background: #e5e7eb;
  }

  .save-btn {
    padding: 4px 12px;
  }

    .container {
      display: flex;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
    }
  
    .sidebar {
      width: 256px;
      border-right: 1px solid #e5e7eb;
      background: #f9fafb;
      padding: 8px;
      overflow-y: auto;
      max-height: 600px;
    }
  
    .sections {
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  
    .section {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      background: white;
    }
  
    .section-header {
      width: 100%;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
  
    .section-header:hover {
      background: #f9fafb;
    }
  
    .section-title {
      font-weight: 600;
      color: #374151;
    }
  
    .chevron {
      transition: transform 0.2s ease;
    }
  
    .rotate90 {
      transform: rotate(90deg);
    }
  
    .path-list {
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  
    .path-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.15s;
      position: relative;
    }
  
    .path-item:hover {
      background: #eff6ff;
    }
  
    .icon-container {
      color: #6b7280;
      margin-top: 2px;
    }
  
    .path-content {
      flex: 1;
    }
  
    .path-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #2563eb;
    }
  
    .path-code.highlight {
      color: #059669;
    }
  
    .path-description {
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  
    .main-content {
      flex: 1;
      padding: 16px;
    }
  
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
  
    .title {
      font-size: 18px;
      font-weight: 600;
    }
  
    .add-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      background: #2563eb;
      color: white;
      border-radius: 4px;
      font-size: 14px;
    }
  
    .add-button:hover {
      background: #1d4ed8;
    }
  
    .conditions-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  
    .condition-group {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      background: #f9fafb;
      position: relative;
    }
  
    .remove-button {
      position: absolute;
      right: 8px;
      top: 8px;
      color: #6b7280;
    }
  
    .remove-button:hover {
      color: #ef4444;
    }
  
    .logic-operator {
      margin-bottom: 12px;
    }
  
    .condition-inputs {
      display: grid;
      gap: 12px;
    }
  
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  
    .label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }
  
    .select, .input {
      width: 100%;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-size: 14px;
    }
  
    .preview {
      padding: 12px;
      background: #f9fafb;
      border-radius: 4px;
    }
  
    .expression {
      display: block;
      font-size: 14px;
      word-break: break-all;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  
    @keyframes highlight {
      0% { background-color: rgb(134 239 172); }
      100% { background-color: transparent; }
    }
  
    .inserted {
      animation: highlight 1.5s ease-out;
    }

    .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  </style>