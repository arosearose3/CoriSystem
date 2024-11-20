<script>
    import { onMount } from 'svelte';
    import { user } from '$lib/stores.js'; // Assuming organizationId is stored in stores.js
    import { base } from '$app/paths'; // Import base path
    import { fly } from 'svelte/transition';
    import RecordButton from './RecordButton.svelte';
    import UpdateSchedule from '../../capacity/UpdateSchedule.svelte'; // Add this import
  
    let sortColumn = 'name';
    let sortDirection = 'asc';
    let message = '';
    let showAvailability = true; // State for the checkbox
    let loadingPractitioners = true;

  
    let organizationId;
    let practitioners = [];
    let errorMessage = '';
    let scoredAvailability;
    let pscoredAvailability;

    let selectedPractitioner = null; // Add this for edit mode
 
  
    // Access the organizationId from the practitioner object in the user store
    $: organizationId = $user?.practitioner?.organizationId;
  
    // Fetch practitioner roles by organization on component mount
    onMount(async () => {
      try {
        await loadPractitioners();
        loadingPractitioners = false;
      } catch (error) {
        console.error('Error loading practitioners:', error);
        message = 'An unexpected error occurred while loading practitioners.';
      }
    });
  
    /**
     * Fetches PractitionerRole resources for the organization and processes them.
     */
     async function loadPractitioners() {
    try {
        if (!organizationId) {
            throw new Error('Organization ID is not available');
        }

        const response = await fetch(`${base}/api/role/withOrganization?organizationId=${organizationId}`);
        const data = await response.json();

        if (!data) {
            throw new Error('No data received from server');
        }

        const practitionerRoles = data;
        if (!Array.isArray(practitionerRoles)) {
            throw new Error('Invalid data format: expected an array of PractitionerRole resources');
        }

        // Initialize a new array to store the combined data
        const loadedPractitioners = [];

        // Fetch practitioner details in parallel
        await Promise.all(practitionerRoles.map(async (role) => {
            const practitionerId = role.practitioner?.reference?.split('/')[1];
            if (!practitionerId) return;

            const practitionerData = await fetchPractitionerDetails(practitionerId);
            const capacity = getCapacity(role.extension);
            const availableTimes = role.availableTime || [];
            const lastUpdate = formatLastUpdate(role.meta.lastUpdated);

            loadedPractitioners.push({
                lastUpdate: lastUpdate,
                id: practitionerId,
                roleId: role.id,
                name: practitionerData.name,
                birthDate: practitionerData.birthDate,
                ...capacity,
                availableTimes: availableTimes,
            });
        }));

        practitioners = loadedPractitioners;

    } catch (error) {
        console.error('Error in loadPractitioners:', error);
        message = 'Failed to fetch practitioners. Please try again.';
    }
}
  
    /**
     * Fetches details of a practitioner by their ID.
     * @param {string} practitionerId - The ID of the practitioner.
     * @returns {Object} - An object containing the practitioner's name and birthDate.
     */
    async function fetchPractitionerDetails(practitionerId) {
      try {
        const response = await fetch(`${base}/api/practitioner/${practitionerId}`);
        const practitioner = await response.json(); // Directly get the practitioner resource

          // **Corrected Name Construction: Given Names First, Then Family Name**
          const givenNames = practitioner.name?.[0]?.given?.join(' ') || '';
          const familyName = practitioner.name?.[0]?.family || 'Unknown';
          const fullName = `${givenNames} ${familyName}`.trim();
  
          return {
            name: fullName,
            birthDate: practitioner.birthDate || 'Unknown',
          };
        }
        
      
       catch (error) {
        console.error(`Error fetching practitioner details for ID ${practitionerId}:`, error);
        return { name: 'Unknown', birthDate: 'Unknown' };
      }
    }
  
    /**
     * Extracts capacity information from PractitionerRole extensions.
     * @param {Array} extensions - The extensions array from PractitionerRole.
     * @returns {Object} - An object containing capacity fields.
     */
    function getCapacity(extensions) {
      const capacityExtension = extensions?.find(ext => ext.url === 'https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html');
      if (!capacityExtension) {
        return {
          kids: 0,
          teens: 0,
          adults: 0,
          couples: 0,
          families: 0,
        };
      }
  
      // Extract the specific capacities
      const capacityData = capacityExtension.extension.reduce((acc, ext) => {
        acc[ext.url] = ext.valueInteger || 0;
        return acc;
      }, {});
  
      return {
        kids: capacityData.children || 0,
        teens: capacityData.teens || 0,
        adults: capacityData.adults || 0,
        couples: capacityData.couples || 0,
        families: capacityData.families || 0,
      };
    }
  

    /**
     * Sorts the practitioners array based on the specified column.
     * @param {string} column - The column to sort by.
     */
    function sortTable(column) {

      if (column === 'score' && scoredAvailability) {
      sortPractitionersByScore();
      return;
    }

      if (sortColumn === column) {
        // Toggle sort direction if the same column is clicked
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'asc'; // Reset to ascending order on new column
      }
  
      practitioners = [...practitioners].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      if (sortColumn === 'name') {
        // Sort by name alphabetically
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else {
        // Sort numeric columns
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
  

  
    /**
     * Formats a time string from "HH:MM:SS" to "hAM/PM" format.
     * @param {string} timeStr - The time string in "HH:MM:SS" format.
     * @returns {string} - The formatted time string in "hAM/PM" format.
     */
    function formatTime(timeStr) {
      const [hour, minute, second] = timeStr.split(':').map(Number);
      let period = 'am';
      let hour12 = hour;
  
      if (hour === 0) {
        hour12 = 12;
        period = 'am';
      } else if (hour === 12) {
        period = 'pm';
      } else if (hour > 12) {
        hour12 = hour - 12;
        period = 'pm';
      }
  
      // Optionally, include minutes if they are not zero
      if (minute !== 0) {
        return `${hour12}:${minute.toString().padStart(2, '0')}${period}`;
      }
  
      return `${hour12}${period}`;
    }
  
    /**
     * Formats the available times for display.
     * @param {Array} availableTimes - The availableTime array from PractitionerRole.
     * @returns {Array} - An array of formatted strings representing availability.
     */
    function getFormattedAvailableTimes(availableTimes) {
      if (!availableTimes || availableTimes.length === 0) return [];
  
      const lines = [];
  
      availableTimes.forEach(time => {
        if (time.allDay) {
          const days = time.daysOfWeek.map(day => convertDayCode(day)).join(', ');
          lines.push(`Available ${days}`);
        } else {
          time.daysOfWeek.forEach(day => {
            const dayName = convertDayCode(day);
            const startTime = formatTime(time.availableStartTime);
            const endTime = formatTime(time.availableEndTime);
            lines.push(`Available ${dayName} from ${startTime} until ${endTime}`);
          });
        }
      });
  
      return lines;
    }

  
  
  /**
   * Parses a time string "HH:MM:SS" into minutes since 7 AM.
   * @param {string} timeStr - The time string to parse.
   * @returns {number} - Minutes since 7 AM.
   */
   function parseTimeToMinutes(timeStr) {
    const [hour, minute, second] = timeStr.split(':').map(Number);
    const totalMinutes = (hour * 60 + minute) - 420; // 7 AM is 420 minutes from midnight
    // Ensure the minutes are within 0 to 780 (7 AM to 8 PM)
    return Math.max(0, Math.min(780, totalMinutes));
  }

  function parseTime(timeStr) {
    const [hour, minute, second] = timeStr.split(':').map(Number);
    return { hour, minute };
  }

  /**
   * Computes the bar segments for the availability bar.
   * @param {Array} availableTimes - The practitioner's available times.
   * @returns {Array|null} - An array of segments or null if no availability.
   */
   function getBarSegments(availableTimes) {
    if (!availableTimes || availableTimes.length === 0) return null;

    let segmentsByDay = [];

    availableTimes.forEach(time => {
      const days = time.daysOfWeek || [];
      days.forEach(day => {
        const dayName = convertDayCode(day);
        let segments = [];

        if (time.allDay) {
          // All day availability from 7 AM to 8 PM
          segments.push({ start: 0, end: 780 });
        } else {
          const startMinutes = time.availableStartTime ? parseTimeToMinutes(time.availableStartTime) : null;
          const endMinutes = time.availableEndTime ? parseTimeToMinutes(time.availableEndTime) : null;
          if (startMinutes !== null && endMinutes !== null) {
            segments.push({ start: startMinutes, end: endMinutes });
          }
        }

        // Find existing entry for the day or create a new one
        let dayEntry = segmentsByDay.find(d => d.day === dayName);
        if (!dayEntry) {
          dayEntry = { day: dayName, segments: [] };
          segmentsByDay.push(dayEntry);
        }
        dayEntry.segments = dayEntry.segments.concat(segments);
      });
    });

    // Sort days for consistent display order
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    segmentsByDay.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

    return segmentsByDay;
  }
 function formatTimeRange(startTime, endTime) {
    const startPeriod = startTime.hour >= 12 ? 'pm' : 'am';
    const endPeriod = endTime.hour >= 12 ? 'pm' : 'am';

    let startHour = startTime.hour % 12 || 12;
    let endHour = endTime.hour % 12 || 12;

    let startMinute = startTime.minute ? `:${startTime.minute.toString().padStart(2, '0')}` : '';
    let endMinute = endTime.minute ? `:${endTime.minute.toString().padStart(2, '0')}` : '';

    // If minutes are 0, don't display them
    if (startMinute === ':00') startMinute = '';
    if (endMinute === ':00') endMinute = '';

    if (startPeriod !== endPeriod) {
    // Start time and end time are in different periods
    return `${startHour}${startMinute}${startPeriod}-${endHour}${endMinute}${endPeriod}`;
  } else {
    // Same period, only add period at the end
    return `${startHour}${startMinute}-${endHour}${endMinute}${startPeriod}`;
  }

  }

  /**
   * Converts three-letter day codes to short day names.
   * @param {string} dayCode - The three-letter day code (e.g., 'mon').
   * @returns {string} - The short name of the day (e.g., 'M' or 'T').
   */
  function convertDayCode(dayCode) {
    const dayMap = {
      mon: 'M',
      tue: 'T',
      wed: 'W',
      thu: 'Th',
      fri: 'F',
      sat: 'Sat',
      sun: 'Sun',
    };
    return dayMap[dayCode.toLowerCase()] || dayCode;
  }

  /**
   * Computes the availability information grouped by day.
   * @param {Array} availableTimes - The practitioner's available times.
   * @returns {Array|null} - An array of objects containing day, time ranges, and segments.
   */
  function getAvailabilityByDay(availableTimes) {
    if (!availableTimes || availableTimes.length === 0) return null;

    let availabilityByDay = [];

    availableTimes.forEach(time => {
      const days = time.daysOfWeek || [];
      days.forEach(day => {
        const dayLabel = convertDayCode(day);

        // Find existing entry for the day or create a new one
        let dayEntry = availabilityByDay.find(d => d.day === dayLabel);
        if (!dayEntry) {
          dayEntry = { day: dayLabel, timeRanges: [], segments: [] };
          availabilityByDay.push(dayEntry);
        }

        if (time.allDay) {
          dayEntry.timeRanges.push('all day');
          dayEntry.segments.push({ start: 0, end: 780 });
        } else {
          const startTimeObj = parseTime(time.availableStartTime);
          const endTimeObj = parseTime(time.availableEndTime);
          const timeRangeStr = formatTimeRange(startTimeObj, endTimeObj);

          dayEntry.timeRanges.push(timeRangeStr);

          const startMinutes = parseTimeToMinutes(time.availableStartTime);
          const endMinutes = parseTimeToMinutes(time.availableEndTime);
          dayEntry.segments.push({ start: startMinutes, end: endMinutes });
        }
      });
    });

    // Sort days for consistent display order
    const dayOrder = ['M', 'T', 'W', 'Th', 'F', 'Sat', 'Sun'];
    availabilityByDay.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

    return availabilityByDay;
  }


  function formatLastUpdate(timestamp) {
    const date = new Date(timestamp);
  
    // Get month names in three-letter format
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
  
    // Get hours and format as 12-hour clock
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12 for midnight
  
    // Get minutes and remove leading zero
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    // Return formatted string
    return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
}

  // Define the handler for when availability is processed in RecordButton
  function handleAvailabilityProcessed(event) {
    const structuredAvailability = event.detail.structuredAvailability;
    scoredAvailability = scoreAvailability(structuredAvailability);
    console.log ("OrgPract scoredA:"+JSON.stringify(scoredAvailability));
    pscoredAvailability = JSON.stringify(scoredAvailability);
    sortPractitionersByScore();

  }


  function scoreAvailability(jsonA) {

    let availabilityRequest;
  if (typeof jsonA === 'string') {
    availabilityRequest = JSON.parse(jsonA).availableTime;
  } else {
    availabilityRequest = jsonA.availableTime;
  }
  const scores = [];

  practitioners.forEach((practitioner, index) => {
    if (practitioner && practitioner.availableTimes && Array.isArray(practitioner.availableTimes) && practitioner.availableTimes.length > 0) {
      let totalScore = 0;
      let totalMatches = 0;

      availabilityRequest.forEach((requestedSlot) => {
        let matched = false;
        practitioner.availableTimes.forEach((practitionerSlot) => {
          if (practitionerSlot.daysOfWeek && practitionerSlot.daysOfWeek.length > 0 && requestedSlot.daysOfWeek.some(day => practitionerSlot.daysOfWeek.includes(day))) {
            // Calculate overlap between requestedSlot and practitionerSlot
            const requestedStart = timeToMinutes(requestedSlot.availableStartTime);
            const requestedEnd = timeToMinutes(requestedSlot.availableEndTime);
            const practitionerStart = timeToMinutes(practitionerSlot.availableStartTime);
            const practitionerEnd = timeToMinutes(practitionerSlot.availableEndTime);

            const overlapStart = Math.max(requestedStart, practitionerStart);
            const overlapEnd = Math.min(requestedEnd, practitionerEnd);

            if (overlapStart < overlapEnd) {
              const overlapDuration = overlapEnd - overlapStart;
              const requestedDuration = requestedEnd - requestedStart;
              totalScore += overlapDuration / requestedDuration;
              matched = true;
            }
          }
        });
        if (matched) {
          totalMatches += 1;
        }
      });

      const finalScore = totalMatches > 0 ? totalScore / totalMatches : 0;
      scores.push({ name: practitioner.name, score: finalScore });
    } else {
      console.error(`Practitioner at index ${index} is missing availability or is not formatted correctly:`, practitioner);
      scores.push({ name: practitioner?.name || `unknown-${index}`, score: 0 });
    }
  });

  return scores;
}

function sortPractitionersByScore() {
    if (!scoredAvailability) return;

    // Create a map of practitioner names to scores for quick lookup
    const scoreMap = new Map(scoredAvailability.map(item => [item.name, item.score]));

    // Sort the practitioners array based on scores
    practitioners = practitioners.sort((a, b) => {
      const scoreA = scoreMap.get(a.name) || 0;
      const scoreB = scoreMap.get(b.name) || 0;
      return scoreB - scoreA; // Sort in descending order
    });

    // Update sort column and direction
    sortColumn = 'score';
    sortDirection = 'desc';
  }

 function timeToMinutes(time) {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function handlePractitionerClick(practitioner) {
        selectedPractitioner = {
            ...practitioner,
            id: practitioner.id, // Make sure ID is available for the edit component
            roleId: practitioner.roleId // Make sure roleId is available
        };
    }

    // Add this handler
    function handleEditComplete(event) {
        // Only reload practitioners if the edit was successful
        if (event.detail?.success) {
            loadPractitioners();
        }
        selectedPractitioner = null;
    }

  </script>
  
  <style>

    .practitioner-name {
        cursor: pointer;
        transition: transform 0.3s ease;
        display: inline-block; /* Important for transform to work */
    }

    .practitioner-name:hover {
        transform: scale(1.1);
        font-weight: bold;
    }

.score-column {
    background-color: #e6f3ff; /* Light blue background for the score column */
  }

    table {
      width: 100%;
      border-collapse: collapse;
    }
  
    th,
    td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      vertical-align: top;
    }
  
    th {
      cursor: pointer;
      background-color: #f2f2f2;
    }
  
    th:hover {
      background-color: #ddd;
    }
  
    .availability-row {
      font-size: 80%;
      padding: 2px 0; /* Reduce vertical padding */
    }
  
    .day-label {
      font-weight: normal;
    }
  
    .availability-bar {
      position: relative;
      height: 5px; /* Reduced height */
      background-color: lightblue;
      width: 100%;
      border: 1px solid #ccc;
      margin-top: 2px;
    }
  
    .availability-segment {
      position: absolute;
      height: 100%;
      background-color: darkblue;
    }
  
    /* Checkbox styling */
    label {
      display: block;
      margin-bottom: 10px;
      font-weight: bold;
    }
  </style>
  
<!-- HTML Section -->

  {#if selectedPractitioner}
    <UpdateSchedule
        currentPractitionerRoleId={selectedPractitioner.roleId}
        on:close={handleEditComplete}
    />
  {:else}
 
  <!-- Show Availability Checkbox -->
<span><label>
  <input type="checkbox" bind:checked={showAvailability} />
  Show Availability
</label>
  {#if loadingPractitioners}Loading Practitioner Data...{/if}
</span>

<!--Audio Processing UI-->

<!-- <RecordButton on:availabilityProcessed={handleAvailabilityProcessed} /> -->
 <br>

  <!-- Display scored availability result -->
  {#if scoredAvailability}
  <div>
    <h4>Scored Availability</h4>
    <ul>
      {#each scoredAvailability.sort((a, b) => b.score - a.score) as { name, score }}
        {#if score>0}
        <li>{name}: {score.toFixed(2)}</li>
        {/if}
      {/each}
    </ul>
  </div>
  {/if}



<!-- Table UI -->
{#if practitioners.length > 0}
<table>
  <thead>
    <tr>
      <th on:click={() => sortTable('name')}>Practitioner Name</th>
      {#if scoredAvailability}
        <th on:click={() => sortTable('score')} class="score-column">Availability Score</th>
      {/if}
      <th on:click={() => sortTable('kids')}>Kids</th>
      <th on:click={() => sortTable('teens')}>Teens</th>
      <th on:click={() => sortTable('adults')}>Adults</th>
      <th on:click={() => sortTable('couples')}>Couples</th>
      <th on:click={() => sortTable('families')}>Families</th>
    </tr>
  </thead>
  <tbody>
    {#each practitioners as practitioner}
      <tr>
        <td>
            <span 
                class="practitioner-name" 
                on:click={() => handlePractitionerClick(practitioner)}
            >
                {practitioner.name}
            </span>
            ({practitioner.lastUpdate})
        </td>
        {#if scoredAvailability}
        <td class="score-column">
          {(scoredAvailability.find(s => s.name === practitioner.name)?.score || 0).toFixed(2)}
        </td>
      {/if}
        <td>{practitioner.kids}</td>
        <td>{practitioner.teens}</td>
        <td>{practitioner.adults}</td>
        <td>{practitioner.couples}</td>
        <td>{practitioner.families}</td>
      </tr>
      {#if showAvailability && getAvailabilityByDay(practitioner.availableTimes)}
        {#each getAvailabilityByDay(practitioner.availableTimes) as dayInfo}
          <tr transition:fly="{{ y: -10, duration: 200 }}">
            <!-- Day label aligned under Practitioner Name column -->
            <td class="availability-row day-label">
              {dayInfo.day} {dayInfo.timeRanges.join(', ')}
            </td>
            <!-- Availability bar aligned under Kids to Families columns -->
            <td colspan="5" class="availability-row">
              <div class="availability-bar">
                {#each dayInfo.segments as segment}
                  <div
                    class="availability-segment"
                    style="
                      left: {segment.start / 780 * 100}%;
                      width: {(segment.end - segment.start) / 780 * 100}%;
                    "
                  ></div>
                {/each}
              </div>
            </td>
          </tr>
        {/each}
      {/if}
    {/each}
  </tbody>
</table>
{:else}
<p class="message">{message || ''}</p>
{/if}

{/if}