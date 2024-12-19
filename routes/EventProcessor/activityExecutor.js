import https from 'https';
import nodeFetch from 'node-fetch';


/**
 * ActivityExecutor handles the actual execution of activities defined in PlanDefinitions.
 * It orchestrates the stages of execution:
 * 1. Activity Task Initialization
 * 2. Value Resolution using PropertyResolver
 * 3. URL Construction for API endpoint
 * 4. API Call Execution
 */
export class ActivityExecutor {
    constructor(propertyResolver, fhirClient, taskManager) {
        this.propertyResolver = propertyResolver;
        this.fhirClient = fhirClient;
        this.taskManager = taskManager;
        // Track currently executing activities
        this.activeExecutions = new Map();
    }

    /**
     * Main entry point for executing an activity.
     * Orchestrates all stages of execution and handles errors.
     */
    async executeActivity(activityTask, executionContext) {
        console.log('Starting activity execution with task:', {
            id: activityTask.id,
            context: executionContext
          });

        try {
            // Start activity tracking
            const activityDefinition = await this.initializeActivity(activityTask);
            console.log('Activity definition loaded:', activityDefinition);
        
            const resolvedValues = await this.resolveValues(
              activityDefinition, 
              executionContext
            );
            console.log('Values resolved:', resolvedValues);
        
            const requestConfig = await this.constructRequest(
              resolvedValues, 
              activityTask.id
            );
            console.log('Request config constructed:', requestConfig);

            // Stage 4: Execute API call
            const result = await this.executeApiCall(requestConfig);

            // Update task with success
            await this.completeActivity(activityTask, result);

            return result;

        } catch (error) {
            await this.handleActivityFailure(activityTask, error);
            throw error;
        }
    }

    /**
     * Stage 1a: Initialize execution tracking
     */
    async initializeExecution(activityTask) {
        await this.taskManager.updateTaskStatus(
            activityTask.id,
            'in-progress',
            {}
        );

        this.activeExecutions.set(activityTask.id, {
            startTime: new Date(),
            status: 'running'
        });
    }

    /**
     * Stage 1b: Load and validate activity definition
     */
    async initializeActivity(activityTask) {
        if (!activityTask.instantiatesCanonical) {
            throw new Error('Activity task missing instantiatesCanonical reference');
        }

        const activityId = activityTask.instantiatesCanonical.split('/')[1];
        const activityDefinition = await this.fhirClient.read(
            'ActivityDefinition',
            activityId
        );

        if (!activityDefinition) {
            throw new Error(`ActivityDefinition ${activityId} not found`);
        }

        return activityDefinition;
    }

    /**
     * Stage 2: Use PropertyResolver to resolve all values
     */
    async resolveValues(activityDefinition, executionContext) {
        console.log('Resolving values for activity:', activityDefinition.id);

        const resolvedValues = await this.propertyResolver.resolveActivityInputs(
            activityDefinition,
            executionContext
        );

        // Additional validation of resolved values
        if (!resolvedValues.endpoint) {
            throw new Error('No endpoint resolved for activity');
        }

        if (Object.keys(resolvedValues.inputs).length === 0) {
            console.warn('No input values resolved for activity');
        }

        return resolvedValues;
    }

    /**
     * Stage 3: Construct API request configuration
     */
    async constructRequest(resolvedValues, taskId) {
        console.log('Constructing API request for endpoint:', resolvedValues.endpoint);

        if (!resolvedValues.endpoint) {
            throw new Error('No endpoint URL resolved for activity');
          }

        const url = resolvedValues.endpoint.startsWith('http') 
            ? resolvedValues.endpoint 
            : `https://localhost:3001/${resolvedValues.endpoint}`;

        console.log('Using endpoint URL:', url);

        return {
            url,
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'X-Task-ID': taskId
            },
            body: JSON.stringify(resolvedValues.inputs)
        };
        }

    /**
     * Stage 4: Execute the API call
     */
    async executeApiCall(requestConfig) {
        console.log('Executing API call with config:', requestConfig);
    
        try {
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false 
            });
    
            const response = await nodeFetch(requestConfig.url, {
                method: requestConfig.method,
                headers: requestConfig.headers,
                body: requestConfig.body,
                agent: httpsAgent
            });
    
            if (!response.ok) {
                const errorDetails = await response.text()
                    .catch(() => 'Could not read error response');
                throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorDetails}`);
            }
    
            return await response.json();
    
        } catch (error) {
            console.error('API call failed:', {
                url: requestConfig.url,
                error: error.message,
                details: error.cause
            });
            throw error;
        }
    }

    /**
     * Handle successful activity completion
     */
    async completeActivity(activityTask, result) {
        await this.taskManager.updateTaskStatus(
            activityTask.id,
            'completed',
            result
        );

        this.activeExecutions.set(activityTask.id, {
            status: 'completed',
            endTime: new Date()
        });

        // Clean up tracking after 5 minutes
        setTimeout(() => {
            this.activeExecutions.delete(activityTask.id);
        }, 300000);
    }

    async stopExecution(taskId) {
        const execution = this.activeExecutions.get(taskId);
        if (execution && execution.status === 'running') {
            console.log(`Stopping execution for task ${taskId}`);
            
            // Update execution tracking
            execution.status = 'stopped';
            execution.endTime = new Date();
            
            // Update task status
            await this.taskManager.updateTaskStatus(
                taskId,
                'stopped',
                {
                    reason: 'Execution stopped by system'
                }
            );
    
            // Remove from active executions
            this.activeExecutions.delete(taskId);
        }
    }
    /**
     * Handle activity failures
     */
    async handleActivityFailure(activityTask, error) {
        console.error('Activity execution failed:', error);

        this.activeExecutions.set(activityTask.id, {
            status: 'failed',
            endTime: new Date(),
            error: error.message
        });

        await this.taskManager.updateTaskStatus(
            activityTask.id,
            'failed',
            {
                error: error.message,
                failureTime: new Date().toISOString()
            }
        );
    }

    /**
     * Utility methods for execution tracking
     */
    getExecutionStatus(taskId) {
        return this.activeExecutions.get(taskId);
    }

    getActiveExecutions() {
        return Array.from(this.activeExecutions.entries())
            .map(([taskId, info]) => ({
                taskId,
                ...info
            }));
    }

    /**
     * Clean up when shutting down the system
     */
    async cleanup() {
        const promises = Array.from(this.activeExecutions.entries())
            .map(async ([taskId, info]) => {
                if (info.status === 'running') {
                    await this.taskManager.updateTaskStatus(
                        taskId,
                        'on-hold',
                        {
                            reason: 'System shutdown'
                        }
                    );
                }
            });

        await Promise.all(promises);
        this.activeExecutions.clear();
    }
}