<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    
    let selectedSchedule = 'daily';
    let customCron = '';
    
    const commonSchedules = [
      { id: 'daily', label: 'Daily at midnight', cron: '0 0 * * *' },
      { id: 'weekday', label: 'Every weekday at 9 AM', cron: '0 9 * * 1-5' },
      { id: 'weekly', label: 'Weekly on Sunday at midnight', cron: '0 0 * * 0' },
      { id: 'monthly', label: 'Monthly on the 1st at midnight', cron: '0 0 1 * *' },
      { id: 'custom', label: 'Custom Schedule', cron: '' }
    ];
    
    let customSchedule = {
      minute: '0',
      hour: '0',
      dayMonth: '*',
      month: '*',
      dayWeek: '*'
    };
    
    $: if (selectedSchedule !== 'custom') {
      customCron = commonSchedules.find(s => s.id === selectedSchedule)?.cron || '';
    }
    
    $: customCron = selectedSchedule === 'custom' 
      ? `${customSchedule.minute} ${customSchedule.hour} ${customSchedule.dayMonth} ${customSchedule.month} ${customSchedule.dayWeek}`
      : commonSchedules.find(s => s.id === selectedSchedule)?.cron || '';
  
    function handleSave() {
      dispatch('save', {
        cronExpression: customCron,
        scheduleType: selectedSchedule
      });
    }
  </script>
  
  <div class="space-y-4">
    <div class="space-y-2">
      {#each commonSchedules as schedule}
        <div class="flex items-center">
          <input
            type="radio"
            id={schedule.id}
            name="schedule"
            value={schedule.id}
            bind:group={selectedSchedule}
            class="mr-2"
          />
          <label for={schedule.id}>{schedule.label}</label>
        </div>
      {/each}
    </div>
  
    {#if selectedSchedule === 'custom'}
      <div class="mt-4 p-4 border rounded-md space-y-4">
        <div>
          <label class="block text-sm font-medium">Minute (0-59)</label>
          <input
            type="text"
            bind:value={customSchedule.minute}
            class="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label class="block text-sm font-medium">Hour (0-23)</label>
          <input
            type="text"
            bind:value={customSchedule.hour}
            class="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label class="block text-sm font-medium">Day of Month (1-31)</label>
          <input
            type="text"
            bind:value={customSchedule.dayMonth}
            class="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label class="block text-sm font-medium">Month (1-12)</label>
          <input
            type="text"
            bind:value={customSchedule.month}
            class="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label class="block text-sm font-medium">Day of Week (0-6)</label>
          <input
            type="text"
            bind:value={customSchedule.dayWeek}
            class="w-full p-2 border rounded-md"
          />
        </div>
      </div>
    {/if}
  
    <div class="mt-4">
      <p class="text-sm font-medium">Generated Cron Expression:</p>
      <code class="block p-2 bg-gray-100 rounded-md">{customCron}</code>
    </div>
  
    <button
      on:click={handleSave}
      class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
    >
      Save Timer Event
    </button>
  </div>