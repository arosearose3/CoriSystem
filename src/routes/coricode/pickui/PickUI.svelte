<script>
    import { createEventDispatcher } from 'svelte';
 //   import { Editor } from '@tadashi/svelte-editor-quill';
    
    export let field = {
      type: 'fixed-text',
      widgetType: null,
      value: '',
      fhirpathExpression: ''
    };
  
    const dispatch = createEventDispatcher();
  
    const FIELD_TYPES = [
      { value: 'fixed-text', label: 'Fixed Text' },
      { value: 'fixed-html', label: 'Fixed HTML' },
      { value: 'fixed-number', label: 'Fixed Number' },
      { value: 'dynamic', label: 'Dynamic Value' },
      { value: 'fhirpath', label: 'FHIRPath Expression' },
      { value: 'user', label: 'User Input' }
    ];
  
    const DYNAMIC_OPTIONS = [
      { value: 'practitionerId', label: 'Practitioner ID' },
      { value: 'practitionerRoleId', label: 'Practitioner Role ID' },
      { value: 'organizationId', label: 'Organization ID' },
      { value: 'organizationName', label: 'Organization Name' },
      { value: 'practitionerName', label: 'Practitioner Name' }
    ];
  
    const WIDGETS = [
      { value: 'short-text', label: 'Short Text' },
      { value: 'html', label: 'HTML' },
      { value: 'date', label: 'Date' },
      { value: 'time', label: 'Time' },
      { value: 'datetime', label: 'Date/Time' },
      { value: 'digit-picker', label: 'Digit Picker' },
      { value: 'digit-entry', label: 'Digit Entry' }
    ];
  
    const quillOptions = {
      theme: 'snow'
    };
  
    function handleTypeChange(event) {
      const newType = event.target.value;
      dispatch('update', {
        ...field,
        type: newType,
        widgetType: newType === 'user' ? field.widgetType : null,
        value: '',
        dynamicValue: newType === 'dynamic' ? field.dynamicValue : null,
        fhirpathExpression: newType === 'fhirpath' ? field.fhirpathExpression : ''
      });
    }
  
    function handleHtmlChange(event) {
      const { html } = event?.detail ?? {};
      dispatch('update', {
        ...field,
        value: html
      });
    }
  
    function handleValueChange(event) {
      dispatch('update', {
        ...field,
        value: event.target.value
      });
    }
  
    function handleDynamicValueChange(event) {
      dispatch('update', {
        ...field,
        dynamicValue: event.target.value
      });
    }
  
    function handleFhirpathChange(event) {
      dispatch('update', {
        ...field,
        fhirpathExpression: event.target.value
      });
    }
  
    function handleWidgetChange(event) {
      dispatch('update', {
        ...field,
        widgetType: event.target.value
      });
    }
  </script>
  
  <svelte:head>
    <link
      rel="stylesheet"
      href="https://unpkg.com/quill@2.0.2/dist/quill.snow.css"
      crossorigin
    />
  </svelte:head>
  
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Field Type
      </label>
      <select
        class="w-full p-2 border rounded-md bg-white"
        value={field.type}
        on:change={handleTypeChange}
      >
        {#each FIELD_TYPES as type}
          <option value={type.value}>{type.label}</option>
        {/each}
      </select>
    </div>
  
    {#if field.type === 'fixed-text'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Fixed Text Value
        </label>
        <input
          type="text"
          class="w-full p-2 border rounded-md"
          value={field.value}
          on:input={handleValueChange}
        />
      </div>
    {/if}
  
    {#if field.type === 'fixed-html'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Fixed HTML Content
        </label>
        Editor <!-- <Editor
          options={quillOptions}
          data={field.value}
          on:text-change={handleHtmlChange}
        /> -->
      </div>
    {/if}
  
    {#if field.type === 'fixed-number'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Fixed Number Value
        </label>
        <input
          type="number"
          class="w-full p-2 border rounded-md"
          value={field.value}
          on:input={handleValueChange}
        />
      </div>
    {/if}
  
    {#if field.type === 'dynamic'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Dynamic Value Source
        </label>
        <select
          class="w-full p-2 border rounded-md bg-white"
          value={field.dynamicValue}
          on:change={handleDynamicValueChange}
        >
          <option value="">Select source...</option>
          {#each DYNAMIC_OPTIONS as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    {/if}
  
    {#if field.type === 'fhirpath'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          FHIRPath Expression
        </label>
        <input
          type="text"
          class="w-full p-2 border rounded-md"
          value={field.fhirpathExpression}
          on:input={handleFhirpathChange}
          placeholder="Enter FHIRPath expression..."
        />
      </div>
    {/if}
  
    {#if field.type === 'user'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Widget Type
        </label>
        <select
          class="w-full p-2 border rounded-md bg-white"
          value={field.widgetType}
          on:change={handleWidgetChange}
        >
          <option value="">Select widget type...</option>
          {#each WIDGETS as widget}
            <option value={widget.value}>{widget.label}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>