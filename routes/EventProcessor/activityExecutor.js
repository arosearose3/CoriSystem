export class ActivityExecutor {
  constructor({ callFhirApi, logger }) {
    this.callFhirApi = callFhirApi;
    this.logger = logger;
    this.activityDefinitions = new Map();
    this.initialized = false;
    this.activeExecutions = new Map(); // Track running executions
  }

  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  async cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      this.logger.info('Cancelled execution', { executionId });
      this.activeExecutions.delete(executionId);
    }
  }

  async initialize() {
    try {
      await this.loadActivityDefinitions();
      this.initialized = true;
      this.logger.info('ActivityExecutor initialized', {
        definitionsLoaded: this.activityDefinitions.size
      });
    } catch (error) {
      this.logger.error('ActivityExecutor initialization failed:', error);
      throw error;
    }
  }


  async loadActivityDefinitions() {
    try {
      const response = await this.callFhirApi('GET', 'ActivityDefinition?status=active');
      const definitions = response.entry?.map(e => e.resource) || [];
      
      this.logger.info('Found activity definitions', { 
        total: definitions.length
      });
  
      for (const definition of definitions) {
        // Skip templates
        if (definition.usage === 'combine-activity-template') {
          this.logger.debug('Skipping template activity', {
            id: definition.id,
            name: definition.name
          });
          continue;
        }
  
        // Skip if no dynamicValue or no endpoint
        const endpoint = definition.dynamicValue?.find(dv => dv.path === 'endpoint')?.expression?.expression;
        if (!endpoint) {
          this.logger.debug('Skipping activity - no endpoint defined', {
            id: definition.id,
            name: definition.name
          });
          continue;
        }
  
        this.activityDefinitions.set(definition.id, {
          definition: definition,
          endpoint: endpoint,
          lastUpdated: definition.meta?.lastUpdated
        });
  
        this.logger.info('Loaded activity definition', {
          id: definition.id,
          name: definition.name,
          endpoint: endpoint
        });
      }
  
      this.logger.info('ActivityExecutor initialized', {
        definitionsLoaded: this.activityDefinitions.size
      });
  
    } catch (error) {
      this.logger.error('Failed to load activity definitions:', error);
      throw error;
    }
  }

 async execute({ activityRef, planId, triggerEvent, eventData, author }) {
  console.log ("in execute triggerEvent: ", triggerEvent);
    if (!this.initialized) {
      throw new Error('ActivityExecutor not initialized');
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const execution = {
        id: executionId,
        activityRef,
        planId,
        status: 'running',
        startTime: new Date(),
        triggerEvent
      };

      this.activeExecutions.set(executionId, execution);
      this.logger.info('Starting activity execution', { executionId, activityRef, planId });

      const cachedDef = this.activityDefinitions.get(activityRef);
      if (!cachedDef) {
        throw new Error(`Activity definition not found: ${activityRef}`);
      }

      const result = await fetch(cachedDef.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...eventData,
          planId,
          author,
          executionId
        })
      });

      if (!result.ok) {
        throw new Error(`Activity execution failed: ${result.status} ${result.statusText}`);
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = await result.json();

      this.logger.info('Activity execution completed', { executionId });
      return execution.result;

    } catch (error) {
      this.logger.error('Activity execution failed', {
        executionId,
        error: error.message,
        stack: error.stack
      });

      if (this.activeExecutions.has(executionId)) {
        const execution = this.activeExecutions.get(executionId);
        execution.status = 'failed';
        execution.error = error.message;
        execution.endTime = new Date();
      }

      throw error;

    } finally {
      // Keep failed executions for a short time for inspection
      if (this.activeExecutions.has(executionId)) {
        const execution = this.activeExecutions.get(executionId);
        if (execution.status === 'completed') {
          this.activeExecutions.delete(executionId);
        } else {
          // Clean up failed executions after a delay
          setTimeout(() => {
            this.activeExecutions.delete(executionId);
          }, 5 * 60 * 1000); // Keep for 5 minutes
        }
      }
    }
  }

  // Add cleanup method for shutdown
  async cleanup() {
    this.logger.info('Cleaning up activity executor', {
      activeExecutions: this.activeExecutions.size
    });

    // Cancel all active executions
    for (const [executionId, execution] of this.activeExecutions) {
      await this.cancelExecution(executionId);
    }

    this.logger.info('Activity executor cleanup complete');
  }
}