<script>
  let hoveredProvenance = null;
  let provenanceTimeout = null;

  let provenanceRecords = [
    { versionId: '1', status: 'draft', recorded: '2023-09-10T10:00:00Z', agent: 'Practitioner/123', activity: 'create', reason: 'Initial workflow' },
    { versionId: '2', status: 'requested', recorded: '2023-09-11T10:30:00Z', agent: 'Practitioner/456', activity: 'update', reason: 'Workflow step 1' },
    { versionId: '3', status: 'accepted', recorded: '2023-09-12T14:00:00Z', agent: 'Practitioner/789', activity: 'update', reason: 'Workflow step 2' },
    { versionId: '4', status: 'in-progress', recorded: '2023-09-13T16:00:00Z', agent: 'Practitioner/123', activity: 'update', reason: 'Workflow step 3' },
    { versionId: '5', status: 'completed-or-failed', recorded: '2023-09-14T18:00:00Z', agent: 'Practitioner/456', activity: 'complete', reason: 'Final step' }
  ];

  let stateTransitions = [
    { start: 'draft', end: 'requested' },
    { start: 'requested', end: 'accepted' },
    { start: 'accepted', end: 'in-progress' },
    { start: 'in-progress', end: 'completed-or-failed' }
  ];

  let taskStates = [
    { code: 'draft', display: 'Draft', x: 20, y: 20, width: 180, height: 80, actor: 'Requester', color: '#fff', zIndex: 0 },
    { code: 'requested', display: 'Requested', x: 20, y: 150, width: 180, height: 80, actor: 'Requester', color: '#fff', zIndex: 0 },
    { code: 'accepted', display: 'Accepted', x: 300, y: 150, width: 180, height: 80, actor: 'Referral Target', color: '#fff', zIndex: 0 },
    { code: 'in-progress', display: 'In Progress', x: 550, y: 300, width: 180, height: 80, actor: 'Referral Target', color: '#fff', zIndex: 0 },
    { code: 'completed-or-failed', display: 'Completed or Failed', x: 500, y: 450, width: 180, height: 80, actor: 'Referral Target', color: '#fff', zIndex: 0 },
    { code: 'rejected', display: 'Rejected', x: 300, y: 20, width: 180, height: 80, actor: 'Requester', color: '#fff', zIndex: 0 },
    { code: 'canceled', display: 'Canceled', x: 20, y: 450, width: 180, height: 80, actor: 'Requester', color: '#fff', zIndex: 0 },
    { code: 'on-hold', display: 'On Hold', x: 280, y: 350, width: 180, height: 80, actor: 'Referral Target', color: '#fff', zIndex: 0 }
  ];

  function showProvenanceDetails(stateCode, event) {
    clearTimeout(provenanceTimeout); // Cancel any pending hiding animations
    const record = provenanceRecords.find(r => r.status === stateCode);
    if (record) {
      const boundingRect = event.currentTarget.getBoundingClientRect();
      hoveredProvenance = {
        ...record,
        x: boundingRect.left + window.scrollX,
        y: boundingRect.top + window.scrollY - 120
      };
    }
  }

  function hideProvenanceDetails() {
    provenanceTimeout = setTimeout(() => {
      hoveredProvenance = null;
    }, 200); // Add a slight delay for smoother hiding animation
  }

  function getCenterPosition(state) {
    return { cx: state.x + state.width / 2, cy: state.y + state.height / 2 };
  }

  function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  function generateArrowSegments(startState, endState, segmentLength = 30) {
    const x1 = getCenterPosition(startState).cx;
    const y1 = getCenterPosition(startState).cy;
    const x2 = getCenterPosition(endState).cx;
    const y2 = getCenterPosition(endState).cy;

    const distance = calculateDistance(x1, y1, x2, y2);
    const steps = Math.floor(distance / segmentLength);
    const arrows = [];

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const xStart = x1 + t * (x2 - x1);
      const yStart = y1 + t * (y2 - y1);
      const xEnd = xStart + (segmentLength / distance) * (x2 - x1);
      const yEnd = yStart + (segmentLength / distance) * (y2 - y1);

      arrows.push({ x1: xStart, y1: yStart, x2: xEnd, y2: yEnd });
    }

    return arrows;
  }

  function findState(code) {
    return taskStates.find(state => state.code === code);
  }
</script>

<!-- Diagram Container with Arrows and States -->
<div class="diagram-container">
  <svg width="800" height="600">
    <defs>
      <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto">
        <polygon points="0 0, 5 2.5, 0 5" fill="black"/>
      </marker>
    </defs>

    {#each stateTransitions as transition}
      {#if findState(transition.start) && findState(transition.end)}
        {#each generateArrowSegments(findState(transition.start), findState(transition.end)) as segment}
          <line 
            x1={segment.x1} 
            y1={segment.y1} 
            x2={segment.x2} 
            y2={segment.y2} 
            stroke="black" 
            stroke-width="2" 
            marker-end="url(#arrowhead)" 
          />
        {/each}
      {/if}
    {/each}
  </svg>

  <!-- Task States with Provenance Interaction -->
  {#each taskStates as state (state.code)}
    <div 
      class="state" 
      style="top: {state.y}px; left: {state.x}px; background-color: {state.color}; z-index: {state.zIndex}; width: {state.width}px; height: {state.height}px;"
      on:mouseenter={(event) => showProvenanceDetails(state.code, event)}
      on:mouseleave={hideProvenanceDetails}
    >
      <strong>{state.display}</strong>
      <p>Actor: {state.actor}</p>
    </div>
  {/each}
</div>

<!-- Provenance Details Hover Display -->
{#if hoveredProvenance}
  <div 
    class="provenance-details" 
    style="position: absolute; top: {hoveredProvenance.y}px; left: {hoveredProvenance.x}px; transform-origin: center; animation: expand 0.2s ease-in forwards; pointer-events: none;" 
  >
    <p><strong>Status:</strong> {hoveredProvenance.status}</p>
    <p><strong>Agent:</strong> {hoveredProvenance.agent}</p>
    <p><strong>Recorded:</strong> {new Date(hoveredProvenance.recorded).toLocaleString()}</p>
    <p><strong>Activity:</strong> {hoveredProvenance.activity}</p>
    <p><strong>Reason:</strong> {hoveredProvenance.reason}</p>
  </div>
{/if}

<style>
  .diagram-container {
    position: relative;
    width: 800px;
    height: 600px;
    margin: 20px 0;
  }

  .state {
    position: absolute;
    padding: 10px;
    border: 2px solid #000;
    border-radius: 5px;
    text-align: center;
    background-color: #fff;
    transition: background-color 0.5s ease-in-out, z-index 0s;
  }

  .provenance-details {
    z-index: 999;
    font-size: 12px;
    background-color: #f9f9f9;
    border: 1px solid black;
    padding: 10px;
    width: 180px;
    pointer-events: none;
  }

  @keyframes expand {
    0% {
      transform: scale(0.5);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
