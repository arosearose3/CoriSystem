<script>
//    import { Editor } from '@tadashi/svelte-editor-quill';
    
    export let fields = [];
  
    const quillOptions = {
      theme: 'snow'
    };
  
    let fieldContents = {};
  
    function handleTextChange(fieldName, event) {
      const { html } = event?.detail ?? {};
      fieldContents[fieldName] = html;
    }
  </script>
  
  <svelte:head>
    <link
      rel="stylesheet"
      href="https://unpkg.com/quill@2.0.2/dist/quill.snow.css"
      crossorigin
    />
  </svelte:head>
  
  <div class="space-y-6">
    {#if fields.length > 0}
      {#each fields as field (field.name)}
        <div class="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <div class="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
            <h3 class="font-medium text-gray-900">{field.name}</h3>
          </div>
          
          <div class="p-4">
            {#if field.type === 'user'}
              {#if field.widgetType === 'short-text'}
                <input 
                  type="text" 
                  class="w-full p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="Enter text"
                />
              {:else if field.widgetType === 'html'}
                Editor  
              {:else if field.widgetType === 'date'}
                <input 
                  type="date" 
                  class="w-full p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              {:else if field.widgetType === 'time'}
                <input 
                  type="time" 
                  class="w-full p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              {:else if field.widgetType === 'datetime'}
                <input 
                  type="datetime-local" 
                  class="w-full p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              {:else if field.widgetType === 'digit-picker'}
                <select 
                  class="p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {#each Array(10) as _, i}
                    <option value={i}>{i}</option>
                  {/each}
                </select>
              {:else if field.widgetType === 'digit-entry'}
                <input 
                  type="number" 
                  class="w-full p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  min="0"
                  max="9"
                  step="1"
                />
              {/if}
            {:else if field.type === 'fixed-text'}
              <div class="p-3 bg-gray-50 rounded-lg border text-gray-700">{field.value || 'No value set'}</div>
            {:else if field.type === 'fixed-html'}
              <div class="p-3 bg-gray-50 rounded-lg border prose max-w-none">
                {@html field.value || 'No HTML content set'}
              </div>
            {:else if field.type === 'fixed-number'}
              <div class="p-3 bg-gray-50 rounded-lg border text-gray-700">{field.value || 'No value set'}</div>
            {:else if field.type === 'dynamic'}
              <div class="p-3 bg-gray-50 rounded-lg border text-gray-600 italic">
                Dynamic Value: {field.dynamicValue || 'Not set'}
              </div>
            {:else if field.type === 'fhirpath'}
              <div class="p-3 bg-gray-50 rounded-lg border font-mono text-sm">
                {field.fhirpathExpression || 'No expression set'}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <div class="text-gray-500 text-center py-8 bg-white rounded-xl border-2 border-dashed">
        No fields to preview. Add some fields in the Design view.
      </div>
    {/if}
  </div>
  
  <style>
    :global(.ql-container) {
      border-radius: 0 0 0.5rem 0.5rem;
    }
    
    :global(.ql-toolbar) {
      border-radius: 0.5rem 0.5rem 0 0;
    }
  
    input, select {
      outline: none;
    }
  </style>
