<script>
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { writable } from 'svelte/store';
    import { base } from '$app/paths';


    const complexPlans = writable([]);
    const basicPlans = writable([]);
    const activeTasks = writable([]);
    const animatingItems = writable(new Set());

    // Load both Plans and Tasks
    async function loadWorkflowData() {
        try {
            // Fetch active tasks with children
            const tasksResponse = await fetch(`${base}/api/workflow/task?_include=Task:partOf`);
            if (!tasksResponse.ok) throw new Error('Failed to load tasks');
            const allTasks = await tasksResponse.json();

            const topLevelTasks = allTasks.filter(task =>
                task.instantiatesCanonical?.startsWith('PlanDefinition/')
            );

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
    <section>
        <div class="section-header">
            <h2>Workflow Instances</h2>
            <button class="btn btn-refresh" on:click={loadWorkflowData}>Refresh</button>
        </div>

        <div class="workflow-list">
            {#each $activeTasks as task (task.id)}
                <div class="workflow-item" class:completed={task.status === 'completed'}>
                    <div class="workflow-info">
                        <h3>{task.instantiatesCanonical}</h3>
                        <span>Status: {task.status}</span>
                    </div>
                    <button
                        class="btn btn-stop"
                        on:click={() => stopWorkflow(task.id)}
                        disabled={task.status === 'completed'}
                    >
                        Stop
                    </button>
                </div>
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