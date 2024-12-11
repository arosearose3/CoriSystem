<!-- ActivityMonitor.svelte -->
<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { slide } from 'svelte/transition';
    import Activity from './ActivityLog.svelte';

    const activities = writable([]);
    let selectedActivity = null;
    let selectedActivityRef = writable(null);

    let leftPaneWidth = 300; // Initial width in pixels
    let isDragging = false;
    let minWidth = 200; // Minimum width for left pane
    let maxWidth = 600; // Maximum width for left pane

    function startDragging() {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        
        // Add event listeners for drag and end
        window.addEventListener('mousemove', handleDragging);
        window.addEventListener('mouseup', stopDragging);
    }

    function handleDragging(event) {
        if (!isDragging) return;
        
        // Calculate new width based on mouse position
        const newWidth = event.clientX;
        
        // Enforce min/max constraints
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            leftPaneWidth = newWidth;
        }
    }

    function stopDragging() {
        isDragging = false;
        document.body.style.cursor = 'default';
        
        // Remove event listeners
        window.removeEventListener('mousemove', handleDragging);
        window.removeEventListener('mouseup', stopDragging);
    }


    // Load all active activities
    async function loadActivities() {
        try {
            const response = await fetch('/api/activities/active');
            if (!response.ok) throw new Error('Failed to load activities');
            const data = await response.json();
            activities.set(data);
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }

    function selectActivity(activity) {
        selectedActivity = activity;
        selectedActivityRef.set(activity);
    }

    function handleUpdate() {
        if (selectedActivityRef) {
            // Trigger the Activity component to update
            selectedActivityRef.update(current => ({ ...current }));
        }
    }

    onMount(loadActivities);

    onDestroy(() => {
        window.removeEventListener('mousemove', handleDragging);
        window.removeEventListener('mouseup', stopDragging);
    });

</script>

<div class="activity-monitor">
    <!-- Left Pane: Activity List -->
        <div 
        class="activity-list"
        style="width: {leftPaneWidth}px"
        >
        <div class="pane-header">
            <h2>Active Activities</h2>
            <button 
                class="btn-refresh"
                on:click={loadActivities}
            >
                Refresh List
            </button>
        </div>

        <div class="activity-items">
            {#each $activities as activity (activity.id)}
                <div 
                    class="activity-item"
                    class:selected={selectedActivity?.id === activity.id}
                    on:click={() => selectActivity(activity)}
                >
                    <div class="activity-info">
                        <h3>{activity.title || activity.name}</h3>
                        <div class="activity-meta">
                            <span class="type">{activity.kind}</span>
                            <span class="count">
                                {activity.executionCount || 0} executions
                            </span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>

        <!-- Draggable Divider -->
        <div 
        class="divider"
        on:mousedown={startDragging}
        class:dragging={isDragging}
    >
        <div class="divider-handle"></div>
    </div>

    <!-- Right Pane: Activity Log -->
    <div class="activity-detail">
        <div class="pane-header">
            <h2>
                {#if selectedActivity}
                    {selectedActivity.title} Executions
                {:else}
                    Select an Activity
                {/if}
            </h2>
            <button 
                class="btn-refresh"
                disabled={!selectedActivity}
                on:click={handleUpdate}
            >
                Update Log
            </button>
        </div>

        <div class="detail-content">
            {#if selectedActivity}
                <Activity
                    parentTaskId={selectedActivity.parentTaskId}
                    activityDefinition={selectedActivity}
                />
            {:else}
                <div class="no-selection">
                    Select an activity from the list to view its execution log
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
   
   .divider {
        width: 8px;
        background: transparent;
        cursor: col-resize;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: background-color 0.2s;
    }

    .divider:hover,
    .divider.dragging {
        background: #e5e7eb;
    }

    .divider-handle {
        width: 2px;
        height: 100%;
        background: #d1d5db;
    }

    .divider:hover .divider-handle,
    .divider.dragging .divider-handle {
        background: #9ca3af;
    }

    /* Make sure activity detail pane expands properly */
    .activity-detail {
        flex: 1;
        min-width: 0; /* Prevent flex item from overflowing */
    }

    /* Add a special cursor while dragging */
    :global(body.dragging) {
        cursor: col-resize !important;
    }

    .activity-monitor {
        display: flex;
        height: 100vh;
        background: #f9fafb;
        user-select: none; /* Prevent text selection while dragging */
    }

    .activity-list {
        border-right: none; /* Remove border since divider will replace it */
        display: flex;
        flex-direction: column;
    }

    .activity-detail {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .pane-header {
        padding: 1rem;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .pane-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
    }

    .btn-refresh {
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-refresh:hover:not(:disabled) {
        background: #2563eb;
    }

    .btn-refresh:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .activity-items {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
    }

    .activity-item {
        padding: 1rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .activity-item:hover {
        border-color: #3b82f6;
        transform: translateX(2px);
    }

    .activity-item.selected {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .activity-info h3 {
        font-size: 0.875rem;
        font-weight: 500;
        color: #111827;
        margin: 0 0 0.25rem 0;
    }

    .activity-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .type {
        padding: 0.125rem 0.375rem;
        background: #f3f4f6;
        border-radius: 1rem;
    }

    .detail-content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
    }

    .no-selection {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6b7280;
        font-size: 0.875rem;
        font-style: italic;
    }
</style>