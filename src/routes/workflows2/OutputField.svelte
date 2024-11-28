<script>
    import { createEventDispatcher } from 'svelte';
    import Trash2 from 'lucide-svelte/icons/trash-2';
    
    export let output;
    export let index;
    export let outputTypes = [];
    
    const dispatch = createEventDispatcher();
    
    function handleNameChange(e) {
      const updatedOutput = { ...output };
      updatedOutput.valueString = e.target.value;
      dispatch('update', updatedOutput);
    }
    
    function handleTypeChange(e) {
      const updatedOutput = { ...output };
      updatedOutput.type.coding[0].code = e.target.value;
      updatedOutput.type.coding[0].display = e.target.selectedOptions[0].text;
      updatedOutput.type.coding[0].system = "http://combinebh.org/fhir/task-outputs";
      dispatch('update', updatedOutput);
    }

    function handleRemove() {
      dispatch('remove');
    }
</script>

<div class="border rounded-lg p-4 space-y-4 relative">
    <button class="absolute top-2 right-2 btn btn-danger" on:click={handleRemove}>
        <Trash2 class="w-4 h-4" />
    </button>

    <div>
        <label class="label">Output Name</label>
        <input
            type="text"
            class="input w-full"
            placeholder="Enter Output Name"
            value={output?.valueString || ''}
            on:input={handleNameChange}
        />
    </div>

    <div>
        <label class="label">Output Type</label>
        <select
            class="select w-full"
            value={output?.type?.coding?.[0]?.code || ''}
            on:change={handleTypeChange}
        >
            <option value="" disabled>Select output type</option>
            {#each outputTypes || [] as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
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
</style>