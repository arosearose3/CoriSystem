<script>
  import { writable, derived } from 'svelte/store';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  const dispatch = createEventDispatcher();

  export let initialAvailability = [];

  let previousInitialAvailability = '';
  let availabilityState = initialAvailability;

    // React to prop changes explicitly
    $: if (initialAvailability) {
         availabilityState = [...initialAvailability]; // Create a new reference for reactivity
 
    console.log("Updated availability received:", initialAvailability);
    // Handle internal updates or re-render logic based on new availability data
  }

  $: console.log("Updated availability in Availability component:", availabilityState);

  // Constants
  const GRID_START_HOUR = 7;
  const GRID_END_HOUR = 21;
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const GRID_GAP = 1;

  const times = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => {
    const hour = i + GRID_START_HOUR;
    return hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
  });

  let availabilities = writable([]);
  let allDayAvailability = writable(DAYS.reduce((acc, day) => ({ ...acc, [day]: false }), {}));
  
  let gridElement;
  let cellWidth = 0;
  let cellHeight = 0;
  let timeColumnWidth = 0;
  let headerHeight = 0;
  let dayHeaderHeight = 0; 
  let mouseX = 0;
  let mouseY = 0;
  let showDialog = false;

  $: ({ time: mouseTime, day: mouseDay, hour: mouseHour, minute: mouseMinute } = translateCoordinates(mouseX, mouseY));

  $: fhirAvailability = derived([availabilities, allDayAvailability], ([$availabilities, $allDayAvailability]) => {
    return DAYS.map(day => {
      const dayAvailabilities = $availabilities.filter(a => a.day === day);
      const isAllDay = $allDayAvailability[day];

      return {
        daysOfWeek: [day],
        allDay: isAllDay,
        availableStartTime: isAllDay ? '08:00:00' : dayAvailabilities.length > 0 ? formatTimeSpec(Math.min(...dayAvailabilities.map(a => a.start))) : null,
        availableEndTime: isAllDay ? '17:00:00' : dayAvailabilities.length > 0 ? formatTimeSpec(Math.max(...dayAvailabilities.map(a => a.end))) : null
      };
    }).filter(at => at.allDay || at.availableStartTime !== null);
  });

  $: {
    dispatch('availabilityUpdate', $fhirAvailability);
  }

  onDestroy(() => {
  console.log("onDestroy fired");
});

   // Function to initialize availabilities
   function initializeAvailabilities() {
    if (initialAvailability && initialAvailability.length > 0) {
      const newAvailabilities = [];
      const newAllDayAvailability = { ...($allDayAvailability) };

      initialAvailability.forEach(avail => {
        if (avail.allDay) {
          newAllDayAvailability[avail.daysOfWeek[0]] = true;
        } else {
          const startHour = parseTimeString(avail.availableStartTime);
          const endHour = parseTimeString(avail.availableEndTime);
          newAvailabilities.push({
            id: crypto.randomUUID(),
            day: avail.daysOfWeek[0],
            start: startHour,
            end: endHour
          });
        }
      });

      availabilities.set(newAvailabilities);
      allDayAvailability.set(newAllDayAvailability);
    } else {
      // Reset if initialAvailability is empty
      availabilities.set([]);
      allDayAvailability.set(DAYS.reduce((acc, day) => ({ ...acc, [day]: false }), {}));
    }
  }
onMount(() => {
    console.log("Component mounted. Initial availability:", JSON.stringify(initialAvailability));
    if (initialAvailability && initialAvailability.length > 0) {
      const newAvailabilities = [];
      const newAllDayAvailability = { ...($allDayAvailability) };

      console.log('Setting up initial availability:', initialAvailability);
      initialAvailability.forEach(avail => {
        if (avail.allDay) {
          newAllDayAvailability[avail.daysOfWeek[0]] = true;
        } else {
          const startHour = parseTimeString(avail.availableStartTime);
          const endHour = parseTimeString(avail.availableEndTime);
          newAvailabilities.push({
            id: crypto.randomUUID(),
            day: avail.daysOfWeek[0],
            start: startHour,
            end: endHour
          });
        }
      });

      availabilities.set(newAvailabilities);
      allDayAvailability.set(newAllDayAvailability);
    }

    // Setting up grid dimensions and event listeners...
    updateGridDimensions();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });


  function parseTimeString(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + minutes / 60;
}


  function handleResize() {
    updateGridDimensions();

// Trigger re-render for both availabilities and all-day rectangles
    availabilities.update(avails => [...avails]);
    allDayAvailability.update(allDay => ({ ...allDay }));
  }

  function updateGridDimensions() {
    if (gridElement) {
      const cells = gridElement.querySelectorAll('.cell');
      if (cells.length > 0) {
        cellWidth = cells[0].offsetWidth;
        cellHeight = cells[0].offsetHeight;
      }
      const timeHeader = gridElement.querySelector('.time-header');
      if (timeHeader) {
        timeColumnWidth = timeHeader.offsetWidth;
      }
      const headerRow = gridElement.querySelector('.header-row');
      if (headerRow) {
        headerHeight = headerRow.offsetHeight;
      }
      const dayHeader = gridElement.querySelector('.day-header');
      if (dayHeader) {
        dayHeaderHeight = dayHeader.offsetHeight;
      }
    }
  }

  function formatTime(hour) {
    const roundedHour = Math.floor(hour);
    const minutes = Math.round((hour - roundedHour) * 60);
    const period = roundedHour >= 12 ? 'PM' : 'AM';
    const displayHour = roundedHour > 12 ? roundedHour - 12 : (roundedHour === 0 ? 12 : roundedHour);
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  function formatTimeSpec(hour) {
    const roundedHour = Math.floor(hour);
    const minutes = Math.round((hour - roundedHour) * 60);
    return `${roundedHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  function handleGridClick(event) {
    if (!gridElement) return;

    const gridRect = gridElement.getBoundingClientRect();
    const clickX = event.clientX - gridRect.left;
    const clickY = event.clientY - gridRect.top;

    const { day, hour } = translateCoordinates(clickX, clickY);

    if (day !== 'N/A' && hour >= GRID_START_HOUR && hour < GRID_END_HOUR) {
      const start = hour;
      const end = Math.min(start + 1, GRID_END_HOUR);

      const newAvailability = {
        id: crypto.randomUUID(),
        day,
        start,
        end
      };

      availabilities.update(avails => [...avails, newAvailability]);
    }
  }

  function handleMouseMove(event) {
    if (!gridElement) return;
    const gridRect = gridElement.getBoundingClientRect();
    mouseX = event.clientX - gridRect.left;
    mouseY = event.clientY - gridRect.top;

    if (draggedAvail) {
      handleDrag(event);
    }
  }

  function calculateLeftPosition(dayIndex) {
   // return timeColumnWidth + (dayIndex * (cellWidth + GRID_GAP));
  
  console.log('timeColumnWidth:', timeColumnWidth);
  console.log('cellWidth:', cellWidth);
  return timeColumnWidth + (dayIndex * (cellWidth + GRID_GAP));
}
  

  function calculateTopPosition(hour) {
    return dayHeaderHeight + ((hour - GRID_START_HOUR) * (cellHeight + GRID_GAP/2));
  }

  function calculateHeight(start, end) {
    return (end - start) * (cellHeight + GRID_GAP/2);
  }


  function translateCoordinates(x, y) {
    if (!gridElement || cellWidth === 0 || cellHeight === 0) {
      return { time: 'N/A', day: 'N/A', hour: -1, minute: -1 };
    }

    const dayIndex = Math.floor((x - timeColumnWidth) / (cellWidth + GRID_GAP));
    const adjustedY = y - dayHeaderHeight;
    const hourFraction = adjustedY / (cellHeight + (GRID_GAP/2)) + GRID_START_HOUR;
    const hour = Math.floor(hourFraction);
    const minute = Math.floor((hourFraction % 1) * 60);

    const time = hour >= GRID_START_HOUR && hour < GRID_END_HOUR ? 
      formatTime(hourFraction) : 'N/A';
    const day = dayIndex >= 0 && dayIndex < DAYS.length ? DAYS[dayIndex] : 'N/A';

    return { time, day, hour, minute };
  }

  // Dragging functionality
  let draggedAvail = null;
  let dragType = null;
  let dragStartY = 0;

  function handleMouseDown(event, avail, type) {
    draggedAvail = avail;
    dragType = type;
    dragStartY = event.clientY;
    event.preventDefault(); // Prevent text selection
  }

  function handleDrag(event) {
    if (!draggedAvail || !gridElement) return;

    const gridRect = gridElement.getBoundingClientRect();
    const y = event.clientY - gridRect.top;
    const { hour } = translateCoordinates(0, y);

    if (hour >= GRID_START_HOUR && hour < GRID_END_HOUR) {
      availabilities.update(avails => 
        avails.map(a => {
          if (a.id === draggedAvail.id) {
            const duration = a.end - a.start;
            if (dragType === 'start') {
              return { ...a, start: Math.min(Math.max(GRID_START_HOUR, hour), a.end - 0.25) };
            } else if (dragType === 'end') {
              return { ...a, end: Math.max(Math.min(GRID_END_HOUR, hour), a.start + 0.25) };
            } else if (dragType === 'move') {
              const delta = hour - a.start;
              const newStart = Math.max(GRID_START_HOUR, Math.min(a.start + delta, GRID_END_HOUR - duration));
              const newEnd = newStart + duration;
              return { ...a, start: newStart, end: newEnd };
            }
          }
          return a;
        })
      );
    }
  }

  function handleMouseUp() {
    if (draggedAvail) {
      availabilities.update(avails => {
        const currentAvail = avails.find(a => a.id === draggedAvail.id);
        if (currentAvail) {
          const hasOverlap = avails.some(a => 
            a.id !== draggedAvail.id && 
            a.day === currentAvail.day && 
            ((a.start <= currentAvail.start && a.end > currentAvail.start) ||
             (a.start < currentAvail.end && a.end >= currentAvail.end) ||
             (a.start >= currentAvail.start && a.end <= currentAvail.end))
          );

          if (hasOverlap) {
            showDialog = true;
            return avails.filter(a => a.id !== draggedAvail.id);
          }
        }
        return avails;
      });
    }
    draggedAvail = null;
    dragType = null;
  }

  function deleteAvailability(id) {
    availabilities.update(avails => avails.filter(a => a.id !== id));
  }

  function closeDialog() {
    showDialog = false;
  }

  function handleAllDayChange(day) {
    allDayAvailability.update(allDay => {
      const newAllDay = { ...allDay, [day]: !allDay[day] };
      if (newAllDay[day]) {
        // Remove all availabilities for this day when set to all day
        availabilities.update(avails => avails.filter(a => a.day !== day));
      }
      return newAllDay;
    });
  }

  function calculateFullDayHeight() {
    return (GRID_END_HOUR - GRID_START_HOUR) * (cellHeight + GRID_GAP/2);
  }
</script>

<div class="instructions">Click checkboxes to show all day availability.</div>

<div class="grid" bind:this={gridElement}>
  <div class="header-row">
    <div class="corner"></div>
    {#each DAYS as day}
      <div class="day-header">
        <div>{day}</div>
        <label>
          <input type="checkbox" 
                 checked={$allDayAvailability[day]} 
                 on:change={() => handleAllDayChange(day)}>
          
        </label>
      </div>
    {/each}
  </div>

  <div class="time-grid">
    {#each times as time, i}
      <div class="time-row">
        <div class="time-header">{time}</div>
        {#each DAYS as day}
          <div class="cell" on:click={handleGridClick}></div>
        {/each}
      </div>
    {/each}
  </div>



  {#each $availabilities as avail (avail.id)}
  {#if !$allDayAvailability[avail.day]}
  <div
    class="avail-rect"
    style="
      left: {calculateLeftPosition(DAYS.indexOf(avail.day))}px;
      top: {calculateTopPosition(avail.start)}px;
      width: {cellWidth}px;
      height: {calculateHeight(avail.start, avail.end)}px;
    "
    on:mousedown={(e) => handleMouseDown(e, avail, 'move')}
  >
    <div 
      class="drag-handle top" 
      on:mousedown|stopPropagation={(e) => handleMouseDown(e, avail, 'start')}
    ></div>
    <div class="time-display">
      {formatTime(avail.start)} - {formatTime(avail.end)}
    </div>
    <div 
      class="drag-handle bottom"
      on:mousedown|stopPropagation={(e) => handleMouseDown(e, avail, 'end')}
    ></div>
    <button class="delete-btn" on:click|stopPropagation={() => deleteAvailability(avail.id)}>×</button>
  </div>
{/if}
{/each}
{#each DAYS as day, dayIndex}
{#if $allDayAvailability[day]}
  <div
    class="avail-rect all-day"
    style="
      left: {calculateLeftPosition(dayIndex)}px;
      top: {dayHeaderHeight}px;
      width: {cellWidth}px;
      height: {calculateFullDayHeight()}px;
    "
  >
    <div class="time-display">All Day</div>
  </div>
{/if}
{/each}
</div>

{#if showDialog}
  <div class="dialog-overlay">
    <div class="dialog">
      <p>Availability ranges may not overlap.</p>
      <button on:click={closeDialog}>OK</button>
    </div>
  </div>
{/if}

<!-- Debug Information 
<div class="debug-info">
  <h3>Debug Information:</h3>
  <p><strong>Mouse Position:</strong> {mouseDay} at {mouseTime}</p>

  <h3>FHIR Availability:</h3>
  <pre>{JSON.stringify($fhirAvailability, null, 2)}</pre>
</div>

-->


<style>
  .instructions {
    margin-bottom: 10px;
    font-weight: bold;
  }

  .grid {
    display: flex;
    flex-direction: column;
    background-color: #ccc;
    position: relative;
  }

  .header-row {
    display: flex;
    background-color: white;
  }

  .corner {
    width: 50px;  /* Adjust as needed */
  }

  .day-header {
    flex: 1;
    padding: 5px;
    text-align: center;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .time-grid {
    display: grid;
    grid-template-columns: auto repeat(7, 1fr);
    gap: 1px;
  }

  .time-row {
    display: contents;
  }

  .time-header, .cell {
    background-color: white;
    padding: 5px;
    text-align: center;
  }

  .cell {
    cursor: pointer;
  }

  .avail-rect {
    position: absolute;
    background-color: rgba(0, 123, 255, 0.5);
    border: 1px solid rgb(0, 123, 255);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    font-size: 10px;
    padding: 2px;
    pointer-events: auto;
  }

  .drag-handle {
    width: 100%;
    height: 10px;
    cursor: ns-resize;
  }

  .drag-handle.top {
    border-top: 2px solid rgb(0, 123, 255);
  }

  .drag-handle.bottom {
    border-bottom: 2px solid rgb(0, 123, 255);
  }

  .time-display {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn {
    position: absolute;
    top: 0;
    right: 0;
    background: none;
    border: none;
    color: rgb(0, 123, 255);
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .dialog {
    background-color: white;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
  }

  .dialog button {
    margin-top: 10px;
    padding: 5px 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }

  .debug-info {
    margin-top: 20px;
    padding: 10px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  .debug-info h3 {
    margin-top: 0;
  }

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .avail-rect.all-day {
    background-color: rgba(0, 200, 0, 0.5);
    border: 1px solid rgb(0, 150, 0);
    position: absolute;
 
  }

  .avail-rect.all-day .time-display {
    font-weight: bold;
  }
</style>