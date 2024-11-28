<script>
    import { createEventDispatcher } from 'svelte';
    import Trash2 from 'lucide-svelte/icons/trash-2';

    export let inputs; // Keep as 'inputs' since it's receiving property.inputs from parent
    export let prefix; 
    export let inputTypes = [];
    export let validationRules = {};
    export let mappingSources = [];
    export let definitionStages = [];
    export let availableTasks = [];
    export let getTaskOutputs = () => [];

    let isTemplateCreation = false;
    let nameInput = {};
    let typeInput = {};
    let definedAtInput = {};
    let mappingSourceInput = {};
    let mappingPathInput = {};
    let validationInput = {};
    let valueInput = {};

    const dispatch = createEventDispatcher();
    
    $: {
        try {
            if (!Array.isArray(inputs)) inputs = [];

            nameInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-name`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-name`,
                        display: "Name"
                    }],
                    text: "Name"
                },
                valueString: ''
            };

            typeInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-type`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-type`,
                        display: "Type"
                    }],
                    text: "Type"
                },
                valueString: ''
            };

            definedAtInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-definedAt`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-definedAt`,
                        display: "Defined At"
                    }],
                    text: "Defined At"
                },
                valueString: ''
            };

            isTemplateCreation = definedAtInput.valueString === 'Template Creation';

            mappingSourceInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-mappingSource`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-mappingSource`,
                        display: "Mapping Source"
                    }],
                    text: "Mapping Source"
                },
                valueString: ''
            };

            mappingPathInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-mappingPath`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-mappingPath`,
                        display: "Mapping Path"
                    }],
                    text: "Mapping Path"
                },
                valueString: ''
            };

            valueInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-value`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-value`,
                        display: "Value"
                    }],
                    text: "Value"
                },
                valueString: ''
            };

            validationInput = inputs.find(input => input?.type?.coding?.[0]?.code === `${prefix}-validation`) || {
                type: {
                    coding: [{
                        system: "http://combinebh.org/fhir/task-inputs",
                        code: `${prefix}-validation`,
                        display: "Validation"
                    }],
                    text: "Validation"
                },
                valueString: ''
            };
        } catch (error) {
            console.error('Error while initializing inputs:', error);
        }
    }

    function handleTemplateValueChange(e) {
        const updatedInput = { 
            ...valueInput, 
            valueString: e.target.value 
        };
        dispatch('update', updatedInput);
    }

    function handleNameChange(e) {
        const updatedInput = { 
            ...nameInput,
            type: {
                coding: [{
                    system: "http://combinebh.org/fhir/task-inputs",
                    code: `${prefix}-name`,
                    display: `${e.target.value} Name`
                }],
                text: `${e.target.value} Name`
            },
            valueString: e.target.value 
        };
        dispatch('update', updatedInput);
    }
    
    function handleTypeChange(e) {
        const updatedInput = { ...typeInput, valueString: e.target.value };
        dispatch('update', updatedInput);
    }
    
    function handleDefinedAtChange(e) {
        const updatedInput = { ...definedAtInput, valueString: e.target.value };
        dispatch('update', updatedInput);
    }
    
    function handleMappingSourceChange(e) {
        const updatedInput = { ...mappingSourceInput, valueString: e.target.value };
        dispatch('update', updatedInput);
    }
    
    function handleMappingPathChange(e) {
        const updatedInput = { ...mappingPathInput, valueString: e.target.value };
        dispatch('update', updatedInput);
    }
    
    function handleValidationChange(rule, checked) {
        let updatedValidation = validationInput.valueString ? validationInput.valueString.split(',') : [];
        if (checked) {
            updatedValidation.push(rule);
        } else {
            updatedValidation = updatedValidation.filter(v => v !== rule);
        }
        const updatedInput = { ...validationInput, valueString: updatedValidation.join(',') };
        dispatch('update', updatedInput);
    }
    
    function handleRemove() {
        dispatch('remove', { prefix });
    }


</script>

<div class="border rounded-lg p-4 space-y-4 relative">
    <button class="absolute top-2 right-2 btn btn-danger" on:click={handleRemove}>
        <Trash2 class="w-4 h-4" />
    </button>

    <!-- Property Name -->
    <div>
        <label class="label">Property Name</label>
        <input
            type="text"
            value={nameInput.valueString}
            on:input={handleNameChange}
            disabled={isTemplateCreation}
        />
    </div>

    <!-- Property Type -->
    <div>
        <label class="label">Property Type</label>
        <select
            value={typeInput.valueString}
            on:change={handleTypeChange}
            disabled={isTemplateCreation}
        >
            <option value="" disabled>Select property type</option>
            {#each inputTypes || [] as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </div>

    <!-- Defined At -->
    <div>
        <label class="label">Defined At</label>
        <select
            value={definedAtInput.valueString}
            on:change={handleDefinedAtChange}
        >
            <option value="" disabled>Select definition stage</option>
            {#each definitionStages || [] as stage}
                <option value={stage.value}>{stage.label}</option>
            {/each}
        </select>
    </div>

    {#if isTemplateCreation}
    <!-- Template Creation Mode - Show Value Input -->
        <div>
            <label class="label">Property Value</label>
            {#if typeInput.valueString === "int" || typeInput.valueString === "float"}
                <input
                    type="number"
                    class="input w-full"
                    placeholder={`Enter ${typeInput.valueString}`}
                    value={valueInput.valueString}
                    on:input={handleTemplateValueChange}
                />

            {:else if typeInput.valueString === "string" || typeInput.valueString === "FhirpathString"}
                <input
                    type="text"
                    class="input w-full"
                    placeholder="Enter value"
                    value={valueInput.valueString}
                    on:input={handleTemplateValueChange}
                />
            {:else if typeInput.valueString === "ResourceReference"}
                <input
                    type="text"
                    class="input w-full"
                    placeholder="Enter Resource Reference"
                    value={valueInput.valueString}
                    on:input={handleTemplateValueChange}
                />
            {/if}
        </div>
    {:else}
        <!-- Normal Mode - Show Mapping Fields -->
        <div>
            <label class="label">Value Mapping Source</label>
            <select
                value={mappingSourceInput.valueString}
                on:change={handleMappingSourceChange}
            >
                <option value="" disabled>Select mapping source</option>
                {#each mappingSources || [] as source}
                    <option value={source.value}>{source.label}</option>
                {/each}
            </select>
        </div>
    
        <div>
            <label class="label">Value Mapping Path</label>
            <input
                type="text"
                value={mappingPathInput.valueString}
                on:input={handleMappingPathChange}
            />
        </div>
    {/if}
 

        <div>
            <label class="label">Validation Rules</label>
            <div>
                {#each validationRules[typeInput.valueString] || [] as rule}
                    <div class="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={validationInput.valueString.split(',').includes(rule)}
                            on:change={(e) => handleValidationChange(rule, e.target.checked)}
                        />
                        <span>{rule}</span>
                    </div>
                {/each}
            </div>
        </div>

   
</div>


  <style>
    .btn-danger {
      background-color: #dc3545;
      color: white;
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
    }
  
    .btn-danger:hover {
      background-color: #c82333;
    }
  
    .mt-4 {
      margin-top: 1rem;
    }
  
    .space-y-2 > * + * {
      margin-top: 0.5rem;
    }
  
    .space-y-4 > * + * {
      margin-top: 1rem;
    }
  
    /* Additional styling if needed */
  </style>
  