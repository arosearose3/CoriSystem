import { BASE_PATH } from '../../serverutils.js';
import { CLIENT_URL } from '../../serverutils.js';
console.log('Loaded BASE_PATH:', BASE_PATH);
console.log('Loaded CLIENT_URL:', CLIENT_URL);


export class ActivityExecutor {
    constructor(propertyResolver, fhirClient, taskManager) {
      this.propertyResolver = propertyResolver;
      this.fhirClient = fhirClient;
      this.taskManager = taskManager;
      // Track currently executing activities
      this.activeExecutions = new Map();
    }
  
    /**
     * Main entry point for executing an activity
     */
    async executeActivity(activityTask, executionContext) {
      console.log('Executing Activity:', activityTask.id);

      try {
        // Start tracking this execution
        await this.taskManager.updateTaskStatus(
            activityTask.id,
            'in-progress',
            {}
        );

        this.activeExecutions.set(activityTask.id, {
          startTime: new Date(),
          status: 'running'
        });
  
        // First get the activity definition
        const activityDefinition = await this.fhirClient.read(
          'ActivityDefinition',
          activityTask.instantiatesCanonical.split('/')[1]
        );
  
        console.log('xActivity definition:', activityDefinition);
        console.log('xActivity inputs:', executionContext);

        // Resolve all input values using PropertyResolver
        const resolvedInputs = await this.propertyResolver.resolveActivityInputs(
          activityDefinition,
          executionContext
        );
  
        console.log('xResolved inputs:', resolvedInputs);

        // Get the API endpoint from the activity definition
        const apiEndpoint = this.getApiEndpoint(activityDefinition);
        if (!apiEndpoint) {
          throw new Error('No API endpoint specified in ActivityDefinition');
        }
  
        // Execute the actual API call
        console.log('xCalling activity endpoint:', apiEndpoint);
        console.log('xInputs:', resolvedInputs);
        console.log('xTask ID:', activityTask.id);
        console.log('xBASE_PATH:', BASE_PATH);
        const result = await this.callActivityEndpoint(
          apiEndpoint,
          resolvedInputs,
          activityTask.id
        );
  
        // Update the task with success
        await this.taskManager.updateTaskStatus(
          activityTask.id,
          'completed',
          result
        );
  
        this.activeExecutions.set(activityTask.id, {
          status: 'completed',
          endTime: new Date()
        });
  
        return result;
  
      } catch (error) {
        // Handle activity failure
        await this.handleActivityFailure(activityTask, error);
        throw error;
      } finally {
        // Clean up tracking after 5 minutes
        setTimeout(() => {
          this.activeExecutions.delete(activityTask.id);
        }, 300000);
      }
    }
  
    /**
     * Extract API endpoint from activity definition
     */
    getApiEndpoint(activityDefinition) {
      const apiConfig = activityDefinition.dynamicValue?.find(
        dv => dv.path === '/Task/apiPath'
      );
      return apiConfig?.expression?.expression;
    }
  
    /**
     * Make the actual API call to execute the activity
     */
async callActivityEndpoint(endpoint, inputs, taskId) {
  console.log('Calling activity endpoint:', endpoint);
  console.log('Inputs:', inputs);
  console.log('Task ID:', taskId);
  console.log('BASE_PATH:', BASE_PATH);
  console.log('CLIENT_URL:', CLIENT_URL);

  try {
    // Ensure endpoint does not have a leading slash or duplicate /api/
    const cleanedEndpoint = endpoint.replace(/^\/|api\//g, '').replace(/^api\//, '');

   // const fullPath = `${CLIENT_URL}/${BASE_PATH}/api/${cleanedEndpoint}`;
    const fullPath = `${CLIENT_URL}/${BASE_PATH}/api/${cleanedEndpoint}`.replace(/([^:]\/)\/+/g, '$1');

    console.log('Calling activity endpoint:', fullPath);

    const response = await fetch(fullPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Task-ID': taskId
      },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    throw new Error(`Activity execution failed: ${error.message}`);
  }
}
  
    /**
     * Handle activity failures with proper error recording
     */
    async handleActivityFailure(activityTask, error) {
      // Update execution tracking
      this.activeExecutions.set(activityTask.id, {
        status: 'failed',
        endTime: new Date(),
        error: error.message
      });
  
      // Update task with failure status
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
     * Get the current status of an executing activity
     */
    getExecutionStatus(taskId) {
      return this.activeExecutions.get(taskId);
    }
  
    /**
     * Get all currently executing activities
     */
    getActiveExecutions() {
      return Array.from(this.activeExecutions.entries()).map(([taskId, info]) => ({
        taskId,
        ...info
      }));
    }
  
    /**
     * Clean up when shutting down the system
     */
    async cleanup() {
      // Record shutdown in all active tasks
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
            await this.taskManager.createProvenance(taskId, 'system-shutdown', {
              state: info
            });
          }
        });
  
      await Promise.all(promises);
      this.activeExecutions.clear();
    }
  }