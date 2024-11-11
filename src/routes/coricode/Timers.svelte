<script>
  import { onMount } from 'svelte';
  import EditTimer from './EditTimer.svelte';
  import { getAllTimers, createTimer, updateTimer, deleteTimer } from '$lib/timerServices.js';

  let timers = [];
  let loading = true;
  let error = null;
  let selectedTimer = null;
  let showAddTimer = false;

  async function loadTimers() {
  try {
    loading = true;
    const eventTemplates = await getAllTimers();
    timers = eventTemplates.map(template => ({
      id: template.id,
      name: template.name,
      schedule: template.schedule,
      description: template.description,
      nextRun: calculateNextRun(template.schedule)
    }));
  } catch (e) {
    error = e.message;
  } finally {
    loading = false;
  }
}

  async function handleDelete(timerId, timerName) {
    if (!confirm('Are you sure you want to delete this timer?')) return;
    
    try {
      await deleteTimer(timerId,timerName);
      await loadTimers();
    } catch (e) {
      alert('Failed to delete timer: ' + e.message);
    }
  }

  function formatNextRun(nextRun) {
    return new Date(nextRun).toLocaleString();
  }

  function calculateNextRun(schedule) {
    // Implementation depends on your scheduling format
    // This is a placeholder
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  async function handleTimerSaved(event) {
    await loadTimers();
    selectedTimer = null;
    showAddTimer = false;
  }
/*   
    try {
      if (selectedTimer) {
        // Handle update
        await updateTimer(selectedTimer.id, event.detail);
      } else {
        // Handle create
        await createTimer(event.detail);
      }
      selectedTimer = null;
      showAddTimer = false;

      //await loadTimers();
    } catch (e) {
      alert('Failed to save timer: ' + e.message);
    }
  } */

  function handleAddTimer() {
    selectedTimer = null;
    showAddTimer = true;
  }
  function handleEdit(timer) {
  selectedTimer = timer;
  showAddTimer = true;
}


  onMount(loadTimers);
</script>

<!-- Rest of the template remains the same -->
  
  {#if !selectedTimer && !showAddTimer}
    <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Timers</h2>
        <button
          on:click={handleAddTimer}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Timer
        </button>
      </div>
  
      {#if loading}
        <div class="text-center py-4">Loading timers...</div>
      {:else if error}
        <div class="text-red-500 py-4">{error}</div>
      {:else if timers.length === 0}
        <div class="text-center py-4 text-gray-500">No timers found</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white">
            <thead>
              <tr class="bg-gray-100">
                <th class="px-6 py-3 text-left">Name</th>
                <th class="px-6 py-3 text-left">Description</th>
                <th class="px-6 py-3 text-left">Frequency</th>
                <th class="px-6 py-3 text-left">Next Run</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each timers as timer}
                <tr class="border-b hover:bg-gray-50">
                  <td 
                    class="px-6 py-4 transition-all hover:font-bold cursor-pointer"
                    on:click={() => handleEdit(timer)}
                  >
                    {timer.name}
                  </td>
                  <td class="px-6 py-4">{timer.description}</td>
                  <td class="px-6 py-4">{timer.schedule}</td>
                  <td class="px-6 py-4">{formatNextRun(timer.nextRun)}</td>
                  <td class="px-6 py-4 text-right">
                    <button
                      on:click={() => handleDelete(timer.id, timer.name)}
                      class="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    <EditTimer
      timer={selectedTimer}
      on:save={handleTimerSaved}
      on:cancel={() => {
        selectedTimer = null;
        showAddTimer = false;
      }}
    />
  {/if}