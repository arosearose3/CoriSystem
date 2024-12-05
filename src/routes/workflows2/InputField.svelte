<script>
    import { createEventDispatcher } from 'svelte';
    import Trash2 from 'lucide-svelte/icons/trash-2';

    export let prefix;
    export let dynamicValues = [];
    export let inputTypes = [];
    export let validationRules = {};
    export let mappingSources = [];
    export let definitionStages = [];

    const dispatch = createEventDispatcher();

    // State for each input aspect
    let nameValue = {
        path: `/Task/input[${prefix}]/name`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-name` }
    };
    let typeValue = {
        path: `/Task/input[${prefix}]/type`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-type` }
    };
    let definedAtValue = {
        path: `/Task/input[${prefix}]/definedAt`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-definedAt` }
    };
    let mappingSourceValue = {
        path: `/Task/input[${prefix}]/mappingSource`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-mappingSource` }
    };
    let mappingPathValue = {
        path: `/Task/input[${prefix}]/mappingPath`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-mappingPath` }
    };
    let validationValue = {
        path: `/Task/input[${prefix}]/validation`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-validation` }
    };
    let valueValue = {
        path: `/Task/input[${prefix}]/value`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-value` }
    };

    let isTemplateCreation = false;

    // Initialize from dynamicValues
    $: {
        try {
            dynamicValues.forEach(dv => {
                const name = dv.expression.name;
                if (name.startsWith(prefix)) {
                    const type = name.split('-')[1];
                    switch(type) {
                        case 'name':
                            nameValue.expression.expression = dv.expression.expression;
                            break;
                        case 'type':
                            typeValue.expression.expression = dv.expression.expression;
                            break;
                        case 'definedAt':
                            definedAtValue.expression.expression = dv.expression.expression;
                            break;
                        case 'mappingSource':
                            mappingSourceValue.expression.expression = dv.expression.expression;
                            break;
                        case 'mappingPath':
                            mappingPathValue.expression.expression = dv.expression.expression;
                            break;
                        case 'validation':
                            validationValue.expression.expression = dv.expression.expression;
                            break;
                        case 'value':
                            valueValue.expression.expression = dv.expression.expression;
                            break;
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing property values:', error);
        }
    }

    $: isTemplateCreation = definedAtValue.expression.expression === 'Template Creation';

    function handleValueChange(field, value) {
        let updatedValue;
        switch(field) {
            case 'name':
                updatedValue = { ...nameValue, expression: { ...nameValue.expression, expression: value }};
                break;
            case 'type':
                updatedValue = { ...typeValue, expression: { ...typeValue.expression, expression: value }};
                break;
            case 'definedAt':
                updatedValue = { ...definedAtValue, expression: { ...definedAtValue.expression, expression: value }};
                break;
            case 'mappingSource':
                updatedValue = { ...mappingSourceValue, expression: { ...mappingSourceValue.expression, expression: value }};
                break;
            case 'mappingPath':
                updatedValue = { ...mappingPathValue, expression: { ...mappingPathValue.expression, expression: value }};
                break;
            case 'validation':
                const rules = Array.isArray(value) ? value.join(',') : value;
                updatedValue = { ...validationValue, expression: { ...validationValue.expression, expression: rules }};
                break;
            case 'value':
                updatedValue = { ...valueValue, expression: { ...valueValue.expression, expression: value }};
                break;
        }
        dispatch('update', { prefix, field, dynamicValue: updatedValue });
    }

    function handleValidationChange(rule, checked) {
        const currentRules = validationValue.expression.expression.split(',').filter(Boolean);
        let newRules;
        if (checked) {
            newRules = [...currentRules, rule];
        } else {
            newRules = currentRules.filter(r => r !== rule);
        }
        handleValueChange('validation', newRules);
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
            class="input w-full"
            value={nameValue.expression.expression}
            on:input={(e) => handleValueChange('name', e.target.value)}
            disabled={isTemplateCreation}
        />
    </div>

    <!-- Property Type -->
    <div>
        <label class="label">Property Type</label>
        <select
            class="select w-full"
            value={typeValue.expression.expression}
            on:change={(e) => handleValueChange('type', e.target.value)}
            disabled={isTemplateCreation}
        >
            <option value="" disabled>Select property type</option>
            {#each inputTypes as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </div>

    <!-- Defined At -->
    <div>
        <label class="label">Defined At</label>
        <select
            class="select w-full"
            value={definedAtValue.expression.expression}
            on:change={(e) => handleValueChange('definedAt', e.target.value)}
        >
            <option value="" disabled>Select definition stage</option>
            {#each definitionStages as stage}
                <option value={stage.value}>{stage.label}</option>
            {/each}
        </select>
    </div>

    {#if isTemplateCreation}
        <!-- Template Creation Mode - Show Value Input -->
        <div>
            <label class="label">Property Value</label>
            {#if typeValue.expression.expression === "int" || typeValue.expression.expression === "float"}
                <input
                    type="number"
                    class="input w-full"
                    placeholder={`Enter ${typeValue.expression.expression}`}
                    value={valueValue.expression.expression}
                    on:input={(e) => handleValueChange('value', e.target.value)}
                />
            {:else}
                <input
                    type="text"
                    class="input w-full"
                    placeholder="Enter value"
                    value={valueValue.expression.expression}
                    on:input={(e) => handleValueChange('value', e.target.value)}
                />
            {/if}
        </div>
    {:else}
        <!-- Normal Mode - Show Mapping Fields -->
        <div>
            <label class="label">Value Mapping Source</label>
            <select
                class="select w-full"
                value={mappingSourceValue.expression.expression}
                on:change={(e) => handleValueChange('mappingSource', e.target.value)}
            >
                <option value="" disabled>Select mapping source</option>
                {#each mappingSources as source}
                    <option value={source.value}>{source.label}</option>
                {/each}
            </select>
        </div>

        <div>
            <label class="label">Value Mapping Path</label>
            <input
                type="text"
                class="input w-full"
                value={mappingPathValue.expression.expression}
                on:input={(e) => handleValueChange('mappingPath', e.target.value)}
            />
        </div>
    {/if}

    <!-- Validation Rules -->
    <div>
        <label class="label">Validation Rules</label>
        <div class="space-y-2">
            {#each validationRules[typeValue.expression.expression] || [] as rule}
                <div class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={validationValue.expression.expression.includes(rule)}
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

    .input, .select {
        border: 1px solid #ddd;
        padding: 0.5rem;
        border-radius: 0.25rem;
        width: 100%;
    }

    .label {
        font-weight: bold;
        margin-bottom: 0.5rem;
        display: block;
    }
</style>
  