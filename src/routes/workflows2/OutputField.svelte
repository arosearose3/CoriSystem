
<script>
    import { createEventDispatcher } from 'svelte';
    import Trash2 from 'lucide-svelte/icons/trash-2';

    export let prefix;
    export let dynamicValues = [];
    export let outputTypes = [];

    const dispatch = createEventDispatcher();

    let nameValue = {
        path: `/Task/output[${prefix}]/name`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-name` }
    };

    let typeValue = {
        path: `/Task/output[${prefix}]/type`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-type` }
    };

    let expressionValue = {
        path: `/Task/output[${prefix}]/expression`,
        expression: { language: "text/fhirpath", expression: "", name: `${prefix}-expression` }
    };

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
                        case 'expression':
                            expressionValue.expression.expression = dv.expression.expression;
                            break;
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing output values:', error);
        }
    }

    function handleValueChange(field, value) {
        let updatedValue;
        switch(field) {
            case 'name':
                updatedValue = { ...nameValue, expression: { ...nameValue.expression, expression: value }};
                break;
            case 'type':
                updatedValue = { ...typeValue, expression: { ...typeValue.expression, expression: value }};
                break;
            case 'expression':
                updatedValue = { ...expressionValue, expression: { ...expressionValue.expression, expression: value }};
                break;
        }
        dispatch('update', { prefix, field, dynamicValue: updatedValue });
    }

    function handleRemove() {
        dispatch('remove', { prefix });
    }
</script>

<div class="border rounded-lg p-4 space-y-4 relative">
    <button class="absolute top-2 right-2 btn btn-danger" on:click={handleRemove}>
        <Trash2 class="w-4 h-4" />
    </button>

    <!-- Output Name -->
    <div>
        <label class="label">Output Name</label>
        <input
            type="text"
            class="input w-full"
            placeholder="Enter Output Name"
            value={nameValue.expression.expression}
            on:input={(e) => handleValueChange('name', e.target.value)}
        />
    </div>

    <!-- Output Type -->
    <div>
        <label class="label">Output Type</label>
        <select
            class="select w-full"
            value={typeValue.expression.expression}
            on:change={(e) => handleValueChange('type', e.target.value)}
        >
            <option value="" disabled>Select output type</option>
            {#each outputTypes as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </div>

    <!-- Output Expression -->
    <div>
        <label class="label">Output Expression</label>
        <input
            type="text"
            class="input w-full"
            placeholder="Enter FHIRPath expression for output"
            value={expressionValue.expression.expression}
            on:input={(e) => handleValueChange('expression', e.target.value)}
        />
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

    .space-y-4 > * + * {
        margin-top: 1rem;
    }
</style>
