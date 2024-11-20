
import https from 'https';
import nodeFetch from 'node-fetch';

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
      this.logger.info('Initializing ActivityExecutor');
      await this.loadActivityDefinitions();
      this.initialized = true;
      this.logger.info('ActivityExecutor initialized', {
        definitionCount: this.activityDefinitions.size,
        definitions: Array.from(this.activityDefinitions.keys())
      });
    } catch (error) {
      this.logger.error('Failed to initialize ActivityExecutor', { error });
      throw error;
    }
  }


  extractEndpointFromDynamicValue(def) {
    const dynamicEndpoint = def.dynamicValue?.find(dv => 
      dv.path === 'endpoint' && 
      dv.expression?.expression
    )?.expression.expression;
    
    if (dynamicEndpoint) {
      // Remove quotes from FHIRPath expression
      return dynamicEndpoint.replace(/^['"](.+)['"]$/, '$1');
    }
  
    return null;
  }

async loadActivityDefinitions() {
  try {
    this.logger.info('Loading activity definitions');
    const response = await this.callFhirApi('GET', 'ActivityDefinition?status=active');

    if (!response.entry) {
      this.logger.warn('No activity definitions found');
      return;
    }

    this.activityDefinitions.clear();

    for (const entry of response.entry) {
      const def = entry.resource;
      const fullId = `ActivityDefinition/${def.id}`;

      // Only look for endpoint in dynamicValue
      const endpoint = this.extractEndpointFromDynamicValue(def);

      this.logger.debug('Processing activity definition', {
    //    id: fullId,
        name: def.name,
        extractedEndpoint: endpoint,
        hasDynamicValues: !!def.dynamicValue
      });



      if (!endpoint) {
        this.logger.debug('Skipping activity definition - no dynamic endpoint', {
          id: fullId,
          name: def.name
        });
        continue;
      }

      this.activityDefinitions.set(fullId, def);

    this.logger.info('Activity definitions loaded', {
      count: this.activityDefinitions.size,
      definitions: Array.from(this.activityDefinitions.entries()).map(([id, def]) => ({
        id,
        name: def.name,
        endpoint: def.endpoint
      }))
    });

    this.logger.debug('Stored activity definition', {
      id: fullId,
      name: def.name,
      dynamicValues: def.dynamicValue
    });
  }

  } catch (error) {
    this.logger.error('Failed to load activity definitions', { error });
    throw error;
  }
}


  async execute({ activityRef, planId, triggerEvent, eventData, author }) {
    if (!this.initialized) {
      throw new Error('ActivityExecutor not initialized');
    }
  
    this.logger.debug('Current activity definitions', {
      count: this.activityDefinitions.size,
      available: Array.from(this.activityDefinitions.keys())
    });

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution = {
      id: executionId,
      activityRef,
      planId,
      status: 'running',
      startTime: new Date(),
      triggerEvent
    };
  
    try {
      for (const entry of response.entry) {
        const def = entry.resource;
        const fullId = `ActivityDefinition/${def.id}`;
  
        // Store the complete definition including dynamicValue
        this.activityDefinitions.set(fullId, def);
  
        this.logger.debug('Stored activity definition', {
          id: fullId,
          name: def.name,
          dynamicValues: def.dynamicValue
        });
      }
  
      // ... existing completion code ...
    } catch (error) {
      // ... existing error handling ...
    }
  }
  
  async execute({ activityRef, planId, triggerEvent, eventData, author }) {
    if (!this.initialized) {
      throw new Error('ActivityExecutor not initialized');
    }
  
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution = {
      id: executionId,
      activityRef,
      planId,
      status: 'running',
      startTime: new Date(),
      triggerEvent
    };
  
    try {
      this.activeExecutions.set(executionId, execution);
      
      // Get full activity definition
      const activityDef = this.activityDefinitions.get(activityRef);
      if (!activityDef) {
        throw new Error(`Activity definition not found: ${activityRef}`);
      }
  
      // Extract endpoint and build payload from dynamicValues
      const payload = {};
      let endpoint;
  
      // Process each dynamic value
      activityDef.dynamicValue?.forEach(dv => {
        if (dv.path === 'endpoint') {
          // Extract endpoint, removing quotes
          endpoint = dv.expression.expression.replace(/['"]/g, '');
        } else {
          // For all other paths, add to payload
          payload[dv.path] = dv.expression.expression.replace(/['"]/g, '');
        }
      });
  
      if (!endpoint) {
        throw new Error(`Activity definition ${activityRef} missing endpoint`);
      }
  
      // Add standard execution context
      const fullPayload = {
        ...payload,           // Properties from dynamicValue
        ...eventData,         // Event data
        planId,
        author,
        executionId,
        triggerEvent
      };
  
      this.logger.debug('Activity execution details', {
        executionId,
        endpoint,
        dynamicValueProperties: Object.keys(payload),
     //   fullPayload
      });
  
      // Prepare request
      const baseUrl = process.env.SERVER_URL || 'https://localhost:3001';
      let fullEndpoint;
      
      // Ensure proper URL construction
      if (endpoint.startsWith('http')) {
        fullEndpoint = endpoint;
      } else {
        // Remove any leading slash from endpoint and ensure baseUrl has no trailing slash
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        fullEndpoint = `${cleanBaseUrl}/${cleanEndpoint}`;
      }
  
      this.logger.debug('URL construction', {
        baseUrl,
        endpoint,
        fullEndpoint
      });
  
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullPayload)
      };


      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates
      });

      const fetchOptionsWithAgent = {
        ...fetchOptions,
        agent: httpsAgent
      };

      const result = await nodeFetch(fullEndpoint, fetchOptionsWithAgent);

     // const result = await fetch(endpoint, fetchOptions);
  
      this.logger.info('Activity endpoint response received', {
        executionId,
        status: result.status,
        ok: result.ok,
        statusText: result.statusText
      });
  
      // Handle non-ok response
      if (!result.ok) {
        const errorDetails = await result.text().catch(() => 'Could not read error response');
        throw new Error(`Activity execution failed: ${result.status} ${result.statusText} - ${errorDetails}`);
      }
  
      // Process successful response
      const responseData = await result.json();
      
      this.logger.debug('Activity execution response parsed', {
        executionId,
        responseKeys: Object.keys(responseData)
      });
  
      // Update execution status
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = responseData;
  
      this.logger.info('Activity execution completed successfully', {
        executionId,
        duration: execution.endTime - execution.startTime
      });
  
      return execution.result;
  
    } catch (error) {
      // Error handling
      this.logger.error('Activity execution failed', {
        executionId,
        activityRef,
        error: error.message,
        stack: error.stack
      });
  
      // Update execution status
      if (this.activeExecutions.has(executionId)) {
        const execution = this.activeExecutions.get(executionId);
        execution.status = 'failed';
        execution.error = error.message;
        execution.endTime = new Date();
      }
  
      throw error;
  
    } finally {
      // Cleanup logic
      if (this.activeExecutions.has(executionId)) {
        const execution = this.activeExecutions.get(executionId);
        if (execution.status === 'completed') {
          this.activeExecutions.delete(executionId);
        } else {
          setTimeout(() => {
            this.logger.debug('Cleaning up failed execution', { executionId });
            this.activeExecutions.delete(executionId);
          }, 5 * 60 * 1000);
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