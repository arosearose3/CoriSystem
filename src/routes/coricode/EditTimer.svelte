<script>
    import { createEventDispatcher } from 'svelte';
    import { createTimer, updateTimer } from '$lib/timerServices';
    const dispatch = createEventDispatcher();
  
    export let timer = null; // If null, we're creating new timer
  
    let oldname = timer?.oldname || '';
    let name = timer?.name || '';
    let description = timer?.description || '';
    let schedule = timer?.schedule || '0 0 * * *';
    let scheduleType = 'preset';
    let saving = false;
    let error = null;
  
    const presets = [
      { id: 'daily', label: 'Daily', cron: '0 0 * * *' },
      { id: 'weekly', label: 'Weekly', cron: '0 0 * * 0' },
      { id: 'monthly', label: 'Monthly', cron: '0 0 1 * *' },
      { id: 'custom', label: 'Custom Schedule', cron: '' }
    ];
  
async function handleSubmit() {
  if (!name || !schedule) {
    error = 'Name and schedule are required';
    return;
  }

  saving = true;
  error = null;

  const timerData = {
    oldname,
    name,
    description,
    schedule,
    ...(timer?.id ? { id: timer.id } : {})
  };

  try {
    let response;
    if (timer?.id) {
      response = await updateTimer(timer.id, timerData);
    } else {
      response = await createTimer(timerData);
    }

    console.log("handleSubmit response:", response);
    dispatch('save', response);
  } catch (e) {
    error = e.message;
  } finally {
    saving = false;
  }
}
  </script>
  
  <div class="container mx-auto p-4 max-w-2xl">
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-6">
        {timer ? 'Edit Timer' : 'Create Timer'}
      </h2>
  
      {#if error}
        <div class="bg-red-50 text-red-500 p-4 rounded mb-4">
          {error}
        </div>
      {/if}
  
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            bind:value={name}
            class="w-full p-2 border rounded"
            placeholder="Enter timer name"
          />
        </div>
  
        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <textarea
            bind:value={description}
            class="w-full p-2 border rounded"
            rows="3"
            placeholder="Enter timer description"
          ></textarea>
        </div>
  
        <div>
          <label class="block text-sm font-medium mb-2">Schedule Type</label>
          <select
            bind:value={scheduleType}
            class="w-full p-2 border rounded mb-2"
          >
            <option value="preset">Common Schedules</option>
            <option value="custom">Custom Cron</option>
          </select>
  
          {#if scheduleType === 'preset'}
            <select
              bind:value={schedule}
              class="w-full p-2 border rounded"
            >
              {#each presets as preset}
                <option value={preset.cron}>{preset.label}</option>
              {/each}
            </select>
          {:else}
            <input
              type="text"
              bind:value={schedule}
              class="w-full p-2 border rounded"
              placeholder="Enter cron expression (e.g., 0 0 * * *)"
            />
          {/if}
        </div>
  
        <div class="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            on:click={() => dispatch('cancel')}
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : (timer ? 'Update' : 'Create')} Timer
          </button>
        </div>
      </form>
    </div>
  </div>