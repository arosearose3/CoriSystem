// TaskDeletionService.js
export class TaskDeletionService {
    constructor(fhirClient, taskManager, activityExecutor, eventManager) {
        this.fhirClient = fhirClient;
        this.taskManager = taskManager;
        this.activityExecutor = activityExecutor;
        this.eventManager = eventManager;
    }

    async deleteTask(taskId, options = { force: false, cascade: true }) {
        console.log(`Starting deletion process for task ${taskId}`, options);

        try {
            // 1. Get task and check type
            const task = await this.fhirClient.read('Task', taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }

            // 2. Get child tasks
            const children = await this.getChildTasks(taskId);

            // 3. Check if deletion is allowed
            if (!options.force) {
                await this.validateDeletion(task, children);
            }

            // 4. Stop any active executions
            await this.stopExecutions(task, children);

            // 5. Clean up webhooks if needed
            await this.cleanupWebhooks(task);

            // 6. Handle child tasks if cascading
            if (options.cascade && children.length > 0) {
                await this.deleteChildTasks(children);
            } else if (children.length > 0) {
                throw new Error('Cannot delete task with children without cascade option');
            }

            // 7. Delete associated Provenance records
            await this.deleteProvenanceRecords(taskId);

            // 8. Finally delete the task itself
            await this.fhirClient.delete('Task', taskId);

            console.log(`Successfully deleted task ${taskId}`);
            return { success: true, deletedChildren: children.length };

        } catch (error) {
            console.error(`Task deletion failed: ${error.message}`);
            throw error;
        }
    }

    async validateDeletion(task, children) {
        // Check task status
        if (task.status === 'in-progress') {
            throw new Error('Cannot delete active task without force option');
        }

        // Check for children
        if (children.length > 0 && !options.cascade) {
            throw new Error(`Task has ${children.length} child tasks`);
        }
    }

    async getChildTasks(taskId) {
        const response = await this.fhirClient.search('Task', {
            'part-of': `Task/${taskId}`
        });
        return response.entry?.map(e => e.resource) || [];
    }

    async stopExecutions(task, children) {
        // Stop main task execution if active
        await this.activityExecutor.stopExecution(task.id);

        // Stop child task executions
        for (const child of children) {
            await this.activityExecutor.stopExecution(child.id);
        }
    }

    async cleanupWebhooks(task) {
        // Clean up any webhooks associated with this task
        await this.eventManager.cleanupTaskWebhooks(task.id);
    }

    async deleteChildTasks(children) {
        for (const child of children) {
            // Recursive deletion for each child
            await this.deleteTask(child.id, { force: true, cascade: true });
        }
    }

    async deleteProvenanceRecords(taskId) {
        const provenanceRecords = await this.fhirClient.search('Provenance', {
            target: `Task/${taskId}`
        });

        for (const entry of provenanceRecords.entry || []) {
            await this.fhirClient.delete('Provenance', entry.resource.id);
        }
    }
}
