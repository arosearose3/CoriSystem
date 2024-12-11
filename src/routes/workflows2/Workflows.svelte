<!-- WorkflowManager.svelte -->
<script>
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import { writable, derived } from 'svelte/store';

    // Stores for our data
    const planDefinitions = writable([]);
    const activeTasks = writable([]);
    
    // Track items being animated (when starting a workflow)
    const animatingItems = writable(new Set());

    // Fetch both Plans and active Tasks
    async function loadWorkflowData() {
    try {
        // Load PlanDefinitions as before...

        // Get all workflow Tasks including children
        const tasksResponse = await fetch('/api/task/workflows?_include=Task:partOf');
        if (!tasksResponse.ok) throw new Error('Failed to load tasks');
        const allTasks = await tasksResponse.json();

        // Organize tasks into their hierarchy
        const topLevelTasks = allTasks.filter(task => 
            // Tasks that instantiate a PlanDefinition are top-level
            task.instantiatesCanonical?.startsWith('PlanDefinition/')
        );

        // For each top task, find its children and grandchildren
        const organizedTasks = topLevelTasks.map(task => ({
            ...task,
            childTasks: allTasks.filter(t => 
                t.partOf?.reference === `Task/${task.id}`
            ).map(childTask => ({
                ...childTask,
                childTasks: allTasks.filter(t => 
                    t.partOf?.reference === `Task/${childTask.id}`
                )
            }))
        }));

        activeTasks.set(organizedTasks);
    } catch (error) {
        console.error('Error loading workflow data:', error);
    }
}
    // Start a workflow by creating a Task and activating endpoints
    async function startWorkflow(plan) {
        try {
            // Add to animating set
            animatingItems.update(set => {
                set.add(plan.id);
                return set;
            });

            // Create the workflow Task
            const response = await fetch('/api/workflow/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    planDefinitionId: plan.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start workflow');
            }

            // The server should handle:
            // 1. Creating the Task
            // 2. Activating any EventDefinitions/endpoints
            // 3. Returning the created Task

            const newTask = await response.json();

            // Update our stores
            planDefinitions.update(plans => 
                plans.filter(p => p.id !== plan.id)
            );
            activeTasks.update(tasks => [...tasks, newTask]);

        } catch (error) {
            console.error('Error starting workflow:', error);
            // Show error to user
        } finally {
            // Remove from animating set
            animatingItems.update(set => {
                set.delete(plan.id);
                return set;
            });
        }
    }

    async function deletePlan(planId) {
        if (!confirm('Are you sure you want to delete this Plan? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/plandefinition/${planId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete plan');

            planDefinitions.update(plans => 
                plans.filter(p => p.id !== planId)
            );
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    }

    async function stopWorkflow(taskId) {
        if (!confirm('Are you sure you want to stop this workflow?')) {
            return;
        }

        try {
            const response = await fetch(`/api/workflow/${taskId}/stop`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to stop workflow');

            // Load fresh data since stopping might affect multiple Tasks
            await loadWorkflowData();
        } catch (error) {
            console.error('Error stopping workflow:', error);
        }
    }

    onMount(loadWorkflowData);
</script>

<div class="workflow-manager">
    <!-- Available Plans Section -->
    <section class="plans-section">
        <h2>Available Workflow Plans</h2>
        <div class="workflow-list">
            {#each $planDefinitions as plan (plan.id)}
<!--                 <div 
                    class="workflow-item"
                    transition:fade
                     animate:flip 
                > -->
                <div 
                class="workflow-item"
                transition:fade
               
            >
                    <div class="workflow-info">
                        <h3>{plan.title}</h3>
                        <p class="description">{plan.description}</p>
                    </div>
                    <div class="actions">
                        <button 
                            class="btn btn-start"
                            disabled={$animatingItems.has(plan.id)}
                            on:click={() => startWorkflow(plan)}
                        >
                            {$animatingItems.has(plan.id) ? 'Starting...' : 'Start'}
                        </button>
                        <button 
                            class="btn btn-delete"
                            on:click={() => deletePlan(plan.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <!-- Active Workflows Section -->
    <section class="active-section">
        <div class="section-header">
            <h2>Workflow Instances</h2>
            <button class="btn btn-refresh" on:click={loadWorkflowData}>
                Update Status
            </button>
        </div>
    
        <div class="workflow-list">
            {#each $activeTasks as task (task.id)}
                <!-- Main Workflow Task -->
<!--                 <div 
                    class="workflow-item"
                    class:completed={task.status === 'completed'}
                    transition:slide
                    animate:flip
                > -->
                <div 
                class="workflow-item"
                class:completed={task.status === 'completed'}
                transition:slide
             
            >

                    <div class="workflow-info">
                        <h3>{task.instantiatesCanonical}</h3>
                        <div class="task-details">
                            <span class="status">Status: {task.status}</span>
                            {#if task.authoredOn}
                                <span class="timing">Started: {new Date(task.authoredOn).toLocaleString()}</span>
                            {/if}
                            {#if task.status === 'completed' && task.executionPeriod?.end}
                                <span class="timing">Completed: {new Date(task.executionPeriod.end).toLocaleString()}</span>
                            {/if}
                        </div>
                    </div>
                    {#if task.status !== 'completed'}
                        <button 
                            class="btn btn-stop"
                            on:click={() => stopWorkflow(task.id)}
                        >
                            Stop
                        </button>
                    {/if}
                </div>
    
                <!-- Child Tasks (Basic Plans) -->
                {#each task.childTasks as childTask (childTask.id)}
                    <div 
                        class="workflow-item child-task"
                        class:completed={childTask.status === 'completed'}
                    >
                        <div class="workflow-info">
                            <h4>{childTask.definitionCanonical || 'Basic Plan Execution'}</h4>
                            <div class="task-details">
                                <span class="status">Status: {childTask.status}</span>
                                {#if childTask.authoredOn}
                                    <span class="timing">Started: {new Date(childTask.authoredOn).toLocaleString()}</span>
                                {/if}
                                {#if childTask.status === 'completed' && childTask.executionPeriod?.end}
                                    <span class="timing">Completed: {new Date(childTask.executionPeriod.end).toLocaleString()}</span>
                                {/if}
                            </div>
                        </div>
                    </div>
    
                    <!-- Grandchild Tasks (Activities) -->
                    {#each childTask.childTasks as activityTask (activityTask.id)}
                        <div 
                            class="workflow-item grandchild-task"
                            class:completed={activityTask.status === 'completed'}
                        >
                            <div class="workflow-info">
                                <h5>{activityTask.definitionCanonical || 'Activity Execution'}</h5>
                                <div class="task-details">
                                    <span class="status">Status: {activityTask.status}</span>
                                    {#if activityTask.authoredOn}
                                        <span class="timing">Started: {new Date(activityTask.authoredOn).toLocaleString()}</span>
                                    {/if}
                                    {#if activityTask.status === 'completed' && activityTask.executionPeriod?.end}
                                        <span class="timing">Completed: {new Date(activityTask.executionPeriod.end).toLocaleString()}</span>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                {/each}
            {/each}
        </div>
    </section>
    
</div>

<style>
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