// EventMonitor.svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  
  let events = new Map();
  let ws;
  let filter = 'all'; // 'all', 'fhir', 'timer', 'webhook'

  function setupWebSocket() {
    ws = new WebSocket(`wss://${window.location.host}`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        resource: 'Event'
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleEventUpdate(data);
    };

    ws.onclose = () => {
      setTimeout(setupWebSocket, 3000);
    };
  }

  function handleEventUpdate(data) {
    events.update(current => {
      const eventInfo = current.get(data.eventId) || {
        type: getEventType(data.type),
        status: 'pending',
        timeline: [],
        details: {}
      };

      // Update status based on event type
      switch (data.type) {
        case 'fhirChangeReceived':
        case 'timerEventReceived':
        case 'webhookReceived':
          eventInfo.status = 'received';
          eventInfo.details = data.details;
          break;
        case 'planExecutionStarted':
          eventInfo.status = 'executing';
          eventInfo.planId = data.planId;
          break;
        case 'planExecutionCompleted':
          eventInfo.status = 'completed';
          break;
        case 'planExecutionFailed':
          eventInfo.status = 'failed';
          eventInfo.error = data.details.error;
          break;
      }

      // Add to timeline
      eventInfo.timeline.push({
        type: data.type,
        timestamp: data.details.timestamp,
        ...data.details
      });

      return new Map(current.set(data.eventId, eventInfo));
    });
  }

  function getEventType(eventType) {
    if (eventType.includes('fhir')) return 'fhir';
    if (eventType.includes('timer')) return 'timer';
    if (eventType.includes('webhook')) return 'webhook';
    return 'unknown';
  }

  function getEventIcon(type) {
    switch (type) {
      case 'fhir':
        return '🏥'; // Hospital icon for FHIR
      case 'timer':
        return '⏰'; // Clock icon for Timer
      case 'webhook':
        return '🔗'; // Link icon for Webhook
      default:
        return '❓'; // Question mark for unknown
    }
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  $: filteredEvents = Array.from(events).filter(([_, event]) => 
    filter === 'all' || event.type === filter
  );

  onMount(() => {
    setupWebSocket();
  });

  onDestroy(() => {
    if (ws) ws.close();
  });
</script>

<div class="event-monitor">
  <div class="header">
    <h2>Event Monitor</h2>
    <div class="filters">
      <select bind:value={filter}>
        <option value="all">All Events</option>
        <option value="fhir">FHIR Changes</option>
        <option value="timer">Timer Events</option>
        <option value="webhook">Webhooks</option>
      </select>
    </div>
  </div>

  {#if filteredEvents.length === 0}
    <p class="empty">No events to display</p>
  {:else}
    <div class="events-grid">
      {#each filteredEvents as [eventId, event] (eventId)}
        <div class="event-card" class:failed={event.status === 'failed'}>
          <div class="event-header">
            <span class="icon">{getEventIcon(event.type)}</span>
            <span class="event-type">{event.type}</span>
            <span class="status" class:failed={event.status === 'failed'}>
              {event.status}
            </span>
          </div>

          <div class="event-details">
            {#if event.details.resourceType}
              <div>Resource: {event.details.resourceType}</div>
            {/if}
            {#if event.details.operation}
              <div>Operation: {event.details.operation}</div>
            {/if}
            {#if event.details.schedule}
              <div>Schedule: {event.details.schedule}</div>
            {/if}
            {#if event.planId}
              <div>Plan: {event.planId}</div>
            {/if}
          </div>

          {#if event.error}
            <div class="error-message">
              {event.error}
            </div>
          {/if}

          <div class="timeline">
            {#each event.timeline as entry}
              <div class="timeline-entry">
                <span class="time">{formatTime(entry.timestamp)}</span>
                <span class="entry-type">{entry.type}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .event-monitor {
    padding: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .event-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .event-card.failed {
    border-color: #ef4444;
    background-color: #fef2f2;
  }

  .event-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .icon {
    font-size: 1.25rem;
  }

  .status {
    margin-left: auto;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    background-color: #f3f4f6;
  }

  .status.failed {
    background-color: #fee2e2;
    color: #ef4444;
  }

  .timeline {
    margin-top: 1rem;
    border-left: 2px solid #e5e7eb;
    padding-left: 1rem;
  }

  .timeline-entry {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .time {
    color: #6b7280;
    margin-right: 0.5rem;
  }

  .error-message {
    margin-top: 1rem;
    padding: 0.5rem;
    background-color: #fee2e2;
    color: #ef4444;
    border-radius: 0.25rem;
  }

  .empty {
    text-align: center;
    color: #6b7280;
    padding: 2rem;
  }
</style>