<script>
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { writable } from 'svelte/store';
    import { base } from '$app/paths';


    const complexPlans = writable([]);
    const basicPlans = writable([]);
    const activeTasks = writable([]);
    const animatingItems = writable(new Set());
    const expandedTasks = writable(new Set());


    // Load both Plans and Tasks
    async function loadWorkflowData() {
    try {
        const tasksResponse = await fetch(`${base}/api/workflow/task?_include=Task:partOf`);
        if (!tasksResponse.ok) throw new Error('Failed to load tasks');
        const allTasks = await tasksResponse.json();

        // Create a Map to deduplicate top-level tasks
        const taskMap = new Map();

        // First pass - identify unique top-level tasks
        allTasks.forEach(task => {
            // Only process top-level tasks (no parent)
            if (!task.partOf && task.instantiatesCanonical?.startsWith('PlanDefinition/')) {
                const planId = task.instantiatesCanonical.split('/')[1];
                
                // Keep the most recent task for each plan
                if (!taskMap.has(planId) || 
                    new Date(task.lastModified) > new Date(taskMap.get(planId).lastModified)) {
                    taskMap.set(planId, task);
                }
            }
        });

        // Organize tasks with their full history of subtasks
        const organizedTasks = Array.from(taskMap.values()).map(task => ({
            ...task,
            childTasks: allTasks
                .filter(t => t.partOf?.reference === `Task/${task.id}`)
                .sort((a, b) => new Date(b.authoredOn) - new Date(a.authoredOn))
                .map(childTask => ({
                    ...childTask,
                    childTasks: allTasks
                        .filter(t => t.partOf?.reference === `Task/${childTask.id}`)
                        .sort((a, b) => new Date(b.authoredOn) - new Date(a.authoredOn))
                }))
        }));

        // Sort top level tasks - active ones first, then by date
        organizedTasks.sort((a, b) => {
            // Active tasks come first
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (b.status === 'active' && a.status !== 'active') return 1;
            // Then sort by date
            return new Date(b.lastModified) - new Date(a.lastModified);
        });

        activeTasks.set(organizedTasks);
    } catch (error) {
        console.error('Error loading workflow data:', error);
    }
}

    async function loadPlans() {
        try {
            const [complexResponse, basicResponse] = await Promise.all([
                fetch(`${base}/api/plandefinition/complex`),
                fetch(`${base}/api/plandefinition/basic`)
            ]);

            if (!complexResponse.ok || !basicResponse.ok) {
                throw new Error('Failed to load plans');
            }

            complexPlans.set(await complexResponse.json());
            basicPlans.set(await basicResponse.json());
        } catch (error) {
            console.error('Error loading plans:', error);
        }
    }

    function toggleExpand(taskId) {
    expandedTasks.update(set => {
        const newSet = new Set(set);
        if (newSet.has(taskId)) {
            newSet.delete(taskId);
        } else {
            newSet.add(taskId);
        }
        return newSet;
    });
}

function getTaskTitle(task) {
    // Extract plan ID from canonical reference
    const planId = task.instantiatesCanonical?.split('/')[1];
    // Find matching plan
    const plan = [...$complexPlans, ...$basicPlans].find(p => p.id === planId);
    return plan?.title || task.instantiatesCanonical;
}

function getTaskTrigger(task) {
    const planId = task.instantiatesCanonical?.split('/')[1];
    const plan = [...$complexPlans, ...$basicPlans].find(p => p.id === planId);
    return plan?.action?.[0]?.trigger?.[0]?.name || 'Unknown';
}

function getActivityName(task) {
    const activityId = task.instantiatesCanonical?.split('/')[1];
    return activityId || 'Unknown Activity';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function getRelativeTime(startDate, currentDate) {
    const diff = new Date(currentDate) - new Date(startDate);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

    async function startWorkflow(plan) {
        try {
            animatingItems.update(set => (set.add(plan.id), set));
            const response = await fetch(`${base}/api/workflow/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id, triggerEvent: plan.action[0].trigger[0] })
            });

            if (!response.ok) throw new Error('Failed to start workflow');
            await loadWorkflowData();
        } catch (error) {
            console.error('Error starting workflow:', error);
        } finally {
            animatingItems.update(set => (set.delete(plan.id), set));
        }
    }

    async function deletePlan(planId, planType) {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            const response = await fetch(`${base}/api/plandefinition/${planId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete plan');

            const updateStore = planType === 'complex' ? complexPlans : basicPlans;
            updateStore.update(plans => plans.filter(p => p.id !== planId));
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    }

    async function stopWorkflow(taskId) {
        if (!confirm('Are you sure you want to stop this workflow?')) return;

        try {
            const response = await fetch(`${base}/api/workflow/${taskId}/stop`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to stop workflow');

            await loadWorkflowData();
        } catch (error) {
            console.error('Error stopping workflow:', error);
        }
    }

    onMount(() => {
        loadPlans();
        loadWorkflowData();
    });
</script>

<div class="workflow-manager">
    <!-- Complex Plans Section -->
    <section>
        <h2>Complex Plans</h2>
        <div class="workflow-list">
            {#each $complexPlans as plan (plan.id)}
                <div class="workflow-item" transition:fade>
                    <div class="workflow-info">
                        <h3>{plan.title}</h3>
                        <p>{plan.description}</p>
                        {#if plan.action?.[0]?.trigger?.[0]}
                            <div class="trigger-info">
                                <span class="trigger-label">Event:</span>
                                {#if plan.action[0].trigger[0].type === 'named-event'}
                                    <span class="trigger-webhook">{plan.action[0].trigger[0].name}</span>
                                {:else}
                                    <span class="trigger-other">{plan.action[0].trigger[0].type}</span>
                                {/if}
                            </div>
                        {/if}
                    </div>
                    <div class="actions">
                        <button
                            class="btn btn-start"
                            disabled={$animatingItems.has(plan.id)}
                            on:click={() => startWorkflow(plan)}
                        >
                            {$animatingItems.has(plan.id) ? 'Activating...' : 'Activate'}
                        </button>
                        <button
                            class="btn btn-delete"
                            on:click={() => deletePlan(plan.id, 'complex')}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <!-- Basic Plans Section -->
    <section>
        <h2>Basic Plans</h2>
        <div class="workflow-list">
            {#each $basicPlans as plan (plan.id)}
                <div class="workflow-item" transition:slide>
                    <div class="workflow-info">
                        <h3>{plan.title}</h3>
                        <p>{plan.description}</p>
                        {#if plan.action?.[0]?.trigger?.[0]}
                            <div class="trigger-info">
                                <span class="trigger-label">Event:</span>
                                {#if plan.action[0].trigger[0].type === 'named-event'}
                                    <span class="trigger-webhook">{plan.action[0].trigger[0].name}</span>
                                {:else}
                                    <span class="trigger-other">{plan.action[0].trigger[0].type}</span>
                                {/if}
                            </div>
                        {/if}
                    </div>
                    <div class="actions">
                        <button
                            class="btn btn-start"
                            disabled={$animatingItems.has(plan.id)}
                            on:click={() => startWorkflow(plan)}
                        >
                            {$animatingItems.has(plan.id) ? 'Activating...' : 'Activate'}
                        </button>
                        <button
                            class="btn btn-delete"
                            on:click={() => deletePlan(plan.id, 'basic')}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <!-- Active Workflows Section -->
<!-- Active Workflows Section -->
<section>
    <div class="section-header">
        <h2>Workflow Instances</h2>
        <button class="btn btn-refresh" on:click={loadWorkflowData}>Refresh</button>
    </div>

    <div class="workflow-list">
        {#each $activeTasks as task (task.id)}
            <div class="task-container">
                <div class="workflow-item" class:task-expanded={$expandedTasks?.has?.(task.id) || false}>
                    <div class="workflow-info">
                        <div class="task-header">
                            <h3>{getTaskTitle(task)}</h3>
                            {#if task.childTasks?.length > 0}
                                <button 
                                    class="expand-btn"
                                    on:click={() => toggleExpand(task.id)}
                                >
                                <svg class="chevron" class:rotated={$expandedTasks?.has?.(task.id) || false} 
                                width="20" height="20" viewBox="0 0 20 20">
                                        <path d="M6 8l4 4 4-4" stroke="currentColor" 
                                              fill="none" stroke-width="2" />
                                    </svg>
                                </button>
                            {/if}
                        </div>
                        
                        <div class="task-details">
                            <span class="trigger-info">
                                Trigger: {getTaskTrigger(task)}
                            </span>
                            <span class="status-badge" class:status-active={task.status === 'active'}
                                  class:status-hold={task.status === 'on-hold'}>
                                {task.status}
                            </span>
                            {#if task.authoredOn}
                                <span class="timing">
                                    Started: {formatDate(task.authoredOn)}
                                </span>
                            {/if}
                        </div>

                        {#if task.childTasks?.[0]}
                            <div class="current-activity">
                                Current: {getActivityName(task.childTasks[0])}
                            </div>
                        {/if}
                    </div>
                    
                    <div class="actions">
                        <button
                            class="btn btn-stop"
                            on:click={() => stopWorkflow(task.id)}
                            disabled={task.status === 'completed'}
                        >
                            Stop
                        </button>
                    </div>
                </div>

                {#if ($expandedTasks?.has?.(task.id) || false) && task.childTasks}
                    <div class="subtasks" transition:slide>
                        {#each task.childTasks as childTask (childTask.id)}
                            <div class="subtask-item">
                                <div class="subtask-connector"></div>
                                <div class="subtask-content">
                                    <h4>{getActivityName(childTask)}</h4>
                                    <div class="subtask-details">
                                        <span class="status-badge" 
                                              class:status-complete={childTask.status === 'completed'}
                                              class:status-active={childTask.status === 'active'}
                                              class:status-hold={childTask.status === 'on-hold'}>
                                            {childTask.status}
                                        </span>
                                        {#if childTask.authoredOn}
                                            <span class="timing">
                                                {getRelativeTime(task.authoredOn, childTask.authoredOn)}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</section>
</div>

<style>
       .task-container {
        margin-bottom: 1rem;
    }

    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .expand-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
    }

    .chevron {
        transition: transform 0.2s ease;
    }

    .chevron.rotated {
        transform: rotate(180deg);
    }

    .task-details {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin: 0.5rem 0;
    }

    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .status-active {
        background: #10B981;
        color: white;
    }

    .status-hold {
        background: #F59E0B;
        color: white;
    }

    .status-complete {
        background: #6B7280;
        color: white;
    }

    .current-activity {
        font-size: 0.875rem;
        color: #6B7280;
        margin-top: 0.25rem;
    }

    .subtasks {
        margin-left: 2rem;
        border-left: 2px solid #E5E7EB;
        padding-left: 1rem;
    }

    .subtask-item {
        position: relative;
        padding: 0.5rem 0;
    }

    .subtask-connector {
        position: absolute;
        left: -1rem;
        top: 50%;
        width: 1rem;
        height: 2px;
        background: #E5E7EB;
    }

    .subtask-content {
        background: #F9FAFB;
        padding: 0.75rem;
        border-radius: 0.375rem;
        border: 1px solid #E5E7EB;
    }

    .subtask-details {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-top: 0.25rem;
    }

    .timing {
        color: #6B7280;
        font-size: 0.875rem;
    }

.trigger-info {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: #4b5563;
    }

    .trigger-label {
        font-weight: 500;
        margin-right: 0.5rem;
    }

    .trigger-webhook {
        background: #dbeafe;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        color: #1e40af;
    }

    .trigger-other {
        background: #e5e7eb;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
    }

    .workflow-manager {
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    section {
        background: white;
        border-radius: 0.5rem;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #1f2937;
    }

    .workflow-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .workflow-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        background: #f9fafb;
    }

    .workflow-info {
        flex: 1;
    }

    .workflow-info h3 {
        font-size: 1.125rem;
        font-weight: 500;
        color: #111827;
    }

    .description, .status, .started {
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 0.25rem;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
    }

    .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-start {
        background: #3b82f6;
        color: white;
    }

    .btn-start:hover:not(:disabled) {
        background: #2563eb;
    }

    .btn-stop {
        background: #ef4444;
        color: white;
    }

    .btn-stop:hover {
        background: #dc2626;
    }

    .btn-delete {
        background: #6b7280;
        color: white;
    }

    .btn-delete:hover {
        background: #4b5563;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .child-task {
        margin-left: 2rem;
        border-left: 2px solid #e5e7eb;
    }

    .grandchild-task {
        margin-left: 4rem;
        border-left: 2px solid #e5e7eb;
    }

    .completed {
        background: #f3f4f6;
        color: #6b7280;
    }

    .completed .status {
        color: #059669;
    }

    .task-details {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.875rem;
    }

    .timing {
        color: #6b7280;
    }

    .btn-refresh {
        background: #3b82f6;
        color: white;
    }

    .btn-refresh:hover {
        background: #2563eb;
    }
</style>