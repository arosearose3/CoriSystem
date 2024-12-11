<!-- Activity.svelte -->
<script>
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    
    // The parent Task represents the activated workflow
    export let parentTaskId;
    
    // Activity details from ActivityDefinition
    export let activityDefinition;
    
    // Store for our execution Tasks
    import { writable } from 'svelte/store';
    const executionTasks = writable([]);
    
    // Load execution Tasks for this activity
    async function loadExecutions() {
        try {
            // Query for Tasks that are part of our parent workflow
            // and match our ActivityDefinition
            const response = await fetch(
                `/api/task/executions?` + 
                `parent=${parentTaskId}&` +
                `definition=${activityDefinition.id}`
            );
            
            if (!response.ok) throw new Error('Failed to load executions');
            
            const tasks = await response.json();
            
            // Sort tasks by creation date to show execution order
            tasks.sort((a, b) => 
                new Date(b.authoredOn) - new Date(a.authoredOn)
            );
            
            executionTasks.set(tasks);
        } catch (error) {
            console.error('Error loading executions:', error);
        }
    }

    // Format duration between start and end/now
    function formatDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        const seconds = Math.floor((end - start) / 1000);
        
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds/60)}m`;
        return `${Math.floor(seconds/3600)}h`;
    }

    onMount(loadExecutions);
</script>

<div class="activity-monitor">
    <div class="activity-header">
        <h3>{activityDefinition.title}</h3>
        <button class="btn-refresh" on:click={loadExecutions}>
            Refresh
        </button>
    </div>

    <div class="executions-timeline">
        {#each $executionTasks as task (task.id)}
            <div 
                class="execution-item"
                class:completed={task.status === 'completed'}
                class:failed={task.status === 'failed'}
                transition:slide
            >
                <div class="execution-header">
                    <span class="timestamp">
                        {new Date(task.authoredOn).toLocaleTimeString()}
                    </span>
                    <span class="status {task.status}">
                        {task.status}
                    </span>
                    <span class="duration">
                        {formatDuration(
                            task.authoredOn, 
                            task.executionPeriod?.end
                        )}
                    </span>
                </div>

                {#if task.input?.length}
                    <div class="execution-details">
                        <h4>Input Parameters:</h4>
                        {#each task.input as input}
                            <div class="parameter">
                                <span class="param-name">{input.type.text}:</span>
                                <span class="param-value">
                                    {input.valueString || input.valueInteger || '...'}
                                </span>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if task.output?.length}
                    <div class="execution-details">
                        <h4>Output:</h4>
                        {#each task.output as output}
                            <div class="parameter">
                                <span class="param-name">{output.type.text}:</span>
                                <span class="param-value">
                                    {output.valueString || output.valueInteger || '...'}
                                </span>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if task.status === 'failed' && task.statusReason}
                    <div class="error-message">
                        {task.statusReason}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .activity-monitor {
        background: white;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .activity-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .executions-timeline {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .execution-item {
        border-left: 4px solid #3b82f6;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 0.25rem;
    }

    .execution-item.completed {
        border-left-color: #059669;
    }

    .execution-item.failed {
        border-left-color: #dc2626;
    }

    .execution-header {
        display: flex;
        gap: 1rem;
        align-items: center;
        font-size: 0.875rem;
    }

    .status {
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 500;
    }

    .status.completed { background: #d1fae5; color: #059669; }
    .status.in-progress { background: #dbeafe; color: #2563eb; }
    .status.failed { background: #fee2e2; color: #dc2626; }

    .execution-details {
        margin-top: 0.75rem;
        font-size: 0.875rem;
    }

    .parameter {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    .param-name {
        color: #6b7280;
        font-weight: 500;
    }

    .error-message {
        margin-top: 0.75rem;
        padding: 0.5rem;
        background: #fee2e2;
        color: #dc2626;
        border-radius: 0.25rem;
        font-size: 0.875rem;
    }
</style>