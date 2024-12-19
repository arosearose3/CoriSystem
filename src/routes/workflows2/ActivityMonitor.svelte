<!-- ActivityMonitor.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import { slide } from 'svelte/transition';
    import Activity from './ActivityLog.svelte';

    const activities = writable([]);
    let selectedActivity = null;
    let selectedActivityRef = writable(null);


    let deletingActivity = null;
    let deletionError = null;


async function checkDeletionStatus(taskId) {
    try {
        const response = await fetch(`/api/task/${taskId}/deletion-status`);
        if (!response.ok) throw new Error('Failed to check deletion status');
        return await response.json();
    } catch (error) {
        console.error('Error checking deletion status:', error);
        return null;
    }
}

async function deleteActivity(activity, force = false, cascade = true) {
    try {
        deletingActivity = activity.id;
        
        // First check if we can delete
        const status = await checkDeletionStatus(activity.id);
        if (!status) {
            throw new Error('Could not check deletion status');
        }

        if (!force && !status.canDelete) {
            if (!confirm(`This task is ${status.status} and has ${status.childCount} child tasks. Force delete?`)) {
                return;
            }
            force = true;
        }

        // Perform deletion
        const response = await fetch(`/api/task/${activity.id}?force=${force}&cascade=${cascade}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Deletion failed: ${response.statusText}`);
        }

        // Remove from activities list
        activities.update(current => 
            current.filter(a => a.id !== activity.id)
        );

        // Clear selection if needed
        if (selectedActivity?.id === activity.id) {
            selectActivity(null);
        }

    } catch (error) {
        console.error('Error deleting activity:', error);
        deletionError = error.message;
    } finally {
        deletingActivity = null;
    }
}


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
        // First get the activities
        const response = await fetch('/api/task/active');
        if (!response.ok) throw new Error('Failed to load activities');
        const activitiesData = await response.json();

        // Then get execution counts for all activities in one request
        const countResponse = await fetch('/api/task/execution-counts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                planIds: activitiesData.map(activity => activity.id.split('/')[1])
            })
        });

        if (!countResponse.ok) throw new Error('Failed to load execution counts');
        const countsData = await countResponse.json();

        // Merge the counts into the activities data
        const activitiesWithCounts = activitiesData.map(activity => {
            const planId = activity.id.split('/')[1];
            const matchingCount = countsData.counts.find(c => c.planId === planId);
            return {
                ...activity,
                executionCount: matchingCount ? matchingCount.count : 0
            };
        });

        activities.set(activitiesWithCounts);
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
            class:deleting={deletingActivity === activity.id}
        >
            <div class="activity-info">
                <h3>{activity.title || activity.name}</h3>
                <div class="activity-meta">
                    <span class="type">{activity.kind}</span>
                    <span class="count">
                        {activity.executionCount || 0} executions
                    </span>
                    <span class="status" class:active={activity.status === 'in-progress'}>
                        {activity.status}
                    </span>
                </div>
            </div>
            <div class="activity-actions">
                <button 
                    class="btn-view"
                    on:click={() => selectActivity(activity)}
                >
                    View
                </button>
                <button 
                    class="btn-delete"
                    disabled={deletingActivity === activity.id}
                    on:click={() => deleteActivity(activity)}
                >
                    {#if deletingActivity === activity.id}
                        Deleting...
                    {:else}
                        Delete
                    {/if}
                </button>
            </div>
        </div>
            {/each}
        </div>
    </div>

    {#if deletionError}
            <div 
                class="error-notification"
                transition:slide
            >
                <p>{deletionError}</p>
                <button on:click={() => deletionError = null}>✕</button>
            </div>
        {/if}

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

    /* ADD to style section */
.activity-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.btn-view,
.btn-delete {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-view {
    background: #e5e7eb;
    color: #374151;
    border: none;
}

.btn-view:hover {
    background: #d1d5db;
}

.btn-delete {
    background: #fee2e2;
    color: #dc2626;
    border: none;
}

.btn-delete:hover:not(:disabled) {
    background: #fecaca;
}

.btn-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.activity-item.deleting {
    opacity: 0.5;
    pointer-events: none;
}

.status {
    padding: 0.125rem 0.375rem;
    background: #f3f4f6;
    border-radius: 1rem;
}

.status.active {
    background: #dcfce7;
    color: #059669;
}

.error-notification {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: #fee2e2;
    color: #dc2626;
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.error-notification button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 1.25rem;
}

.error-notification button:hover {
    color: #b91c1c;
}
</style>