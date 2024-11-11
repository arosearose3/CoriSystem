
// activityExecutor.js
export class ActivityExecutor {
    constructor({ callFhirApi, logger }) {
      this.callFhirApi = callFhirApi;
      this.logger = logger;
      
      // Track active executions
      this.activeExecutions = new Map();
      
      // Activity type handlers
      this.handlers = {
        'notify': this.handleNotification.bind(this),
        'update': this.handleUpdate.bind(this),
        'create': this.handleCreate.bind(this),
        'email': this.handleEmail.bind(this)
      };
    }
  
    async execute({ activityRef, planId, triggerEvent, eventData, author }) {
      try {
        this.logger.info('Starting activity execution', {
          activityRef,
          planId,
          triggerId: triggerEvent.name
        });
  
        // Track execution
        const executionId = `${planId}-${Date.now()}`;
        this.activeExecutions.set(executionId, {
          startTime: new Date(),
          activityRef,
          planId,
          status: 'running'
        });
  
        // Get activity definition
        const activityDef = await this.callFhirApi(
          'GET', 
          `/${activityRef}`
        );
  
        // Determine activity type from definition
        const activityType = activityDef.type?.coding?.[0]?.code || 'unknown';
        
        // Get appropriate handler
        const handler = this.handlers[activityType];
        if (!handler) {
          throw new Error(`No handler for activity type: ${activityType}`);
        }
  
        // Execute activity
        const result = await handler({
          definition: activityDef,
          eventData,
          author,
          executionId
        });
  
        // Update execution status
        this.activeExecutions.set(executionId, {
          ...this.activeExecutions.get(executionId),
          status: 'completed',
          endTime: new Date(),
          result
        });
  
        this.logger.info('Activity execution completed', {
          executionId,
          activityRef,
          planId
        });
  
        return result;
  
      } catch (error) {
        this.logger.error('Activity execution failed', {
          error,
          activityRef,
          planId
        });
        throw error;
      }
    }
  
    // Stub handlers for different activity types
    async handleNotification({ definition, eventData, author, executionId }) {
      this.logger.info('Executing notification activity', { executionId });
      // Stub: Would implement notification logic here
      return { status: 'sent' };
    }
  
    async handleUpdate({ definition, eventData, author, executionId }) {
      this.logger.info('Executing update activity', { executionId });
      // Stub: Would implement resource update logic here
      return { status: 'updated' };
    }
  
    async handleCreate({ definition, eventData, author, executionId }) {
      this.logger.info('Executing create activity', { executionId });
      // Stub: Would implement resource creation logic here
      return { status: 'created' };
    }
  
    async handleEmail({ definition, eventData, author, executionId }) {
      this.logger.info('Executing email activity', { executionId });
      // Stub: Would implement email sending logic here
      return { status: 'sent' };
    }
  
    // Utility methods
    getActiveExecutions() {
      return Array.from(this.activeExecutions.entries()).map(([id, execution]) => ({
        id,
        ...execution
      }));
    }
  
    getExecutionStatus(executionId) {
      return this.activeExecutions.get(executionId);
    }
  
    cancelExecution(executionId) {
      const execution = this.activeExecutions.get(executionId);
      if (execution && execution.status === 'running') {
        execution.status = 'cancelled';
        execution.endTime = new Date();
        this.logger.info('Activity execution cancelled', { executionId });
      }
    }
  }