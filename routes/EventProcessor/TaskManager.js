// taskManager.js

import { nanoid } from 'nanoid';

import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../../serverutils.js';

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


/**
 * TaskManager orchestrates the creation and tracking of FHIR Task resources 
 * that represent workflow execution states. It uses a three-level hierarchy:
 * 
 * Grandparent (Workflow Instance)
 *   └── Parent (Basic Plan Instance)
 *        └── Activity Task
 * 
 * Each level is implemented as a FHIR Task resource with 'partOf' references
 * creating the hierarchy. The system maintains recovery state through
 * Provenance resources that track every state change.
 */
export class TaskManager {

  // ADD property to TaskManager constructor
  constructor(fhirClient, systemDevice) {
    this.fhirClient = fhirClient;
    this.systemDevice = systemDevice;
    this.onTaskCreated = null; // Callback for task creation
}


  async initialize() {
    if (!this.initialized) {
      this.systemDevice = await this.initializeSystemDevice();
      this.initialized = true;
    }
  }


  async cleanupTaskWebhooks(task) {
    // Find any EventDefinitions created for this task's webhooks
    const events = await this.fhirClient.search('EventDefinition', {
        name: task.input.find(i => i.type.coding[0].code === 'trigger-event')?.valueString
    });

    // Delete the EventDefinitions and unregister webhooks
    for (const event of events.entry || []) {
        await this.fhirClient.delete('EventDefinition', event.resource.id);
        await this.eventManager.unregisterEvent(event.resource);
    }
}

async createWebhookTask(planDefinition, trigger, inputData = {}) {
  console.log('Creating webhook parent task for plan:', planDefinition.id);
      
      const task = {
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          instantiatesCanonical: `PlanDefinition/${planDefinition.id}`,
          authoredOn: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          input: [
              {
                  type: {
                      coding: [{
                          system: "http://terminology.hl7.org/CodeSystem/task-input-type",
                          code: "trigger-event"
                      }]
                  },
                  valueString: trigger.name
              },
              ...this.formatTaskInputs(inputData)
          ]
      };

      const savedTask = await this.fhirClient.create(task);
      
      await this.createProvenance(savedTask.id, 'basic-workflow-start', {
          planType: 'basic',
          trigger: trigger.name
      });

      return savedTask;
    }


    /**
   * Creates a task hierarchy appropriate for the workflow type.
   * For Complex Plans: Creates a Workflow Task
   * For Basic Plans: Creates a Parent Task directly
   */

    async createPlanTask(planDefinition, triggerEvent, inputData = {}, isComplex = false) {
      // Create the Task as before
      const task = {
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          instantiatesCanonical: `PlanDefinition/${planDefinition.id}`,
          authoredOn: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          input: [
              {
                  type: {
                      coding: [{
                          system: "http://terminology.hl7.org/CodeSystem/task-input-type",
                          code: "trigger-event"
                      }]
                  },
                  valueString: `${triggerEvent.name}`
              },
              ...this.formatTaskInputs(inputData)
          ]
      };
  
      const savedTask = await this.fhirClient.create(task);
  
      // Instead of trying to create EventDefinitions here, we should
      // dispatch an event that the EventManager can listen to
      if (this.onTaskCreated) {
          this.onTaskCreated(savedTask, planDefinition);
      }
  
      await this.createProvenance(savedTask.id, 
          isComplex ? 'complex-workflow-start' : 'basic-workflow-start',
          {
              planType: isComplex ? 'complex' : 'basic'
          }
      );
  
      return savedTask;
  }



  /**
   * As a workflow executes, we create Parent Tasks for each Basic Plan
   * that's ready to run. These Tasks track the execution of a group
   * of related activities defined in the Basic Plan.
   */
  async createBasicPlanTask(workflowTaskId, basicPlan, inputData = {}) {
    const planTask = {
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      instantiatesCanonical: `PlanDefinition/${basicPlan.id}`,
      partOf: {
        reference: `Task/${workflowTaskId}`
      },
      authoredOn: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      input: this.formatTaskInputs(inputData)
    };

    const savedTask = await this.fhirClient.create(planTask);
    
    await this.createProvenance(savedTask.id, 'plan-start', {
      workflowTaskId
    });

    return savedTask;
  }

  /**
   * At the lowest level, Activity Tasks represent individual pieces of 
   * work being done. These Tasks store the inputs needed for execution
   * and collect the outputs as activities complete.
   */

      /**
     * Enhanced activity task creation that includes context about
     * previous activities
     */
      async createActivityTask(parentTaskId, activityDefinition, inputData = {}) {
        // Get completed activities to make available for input resolution
        const completedActivities = await this.getCompletedActivities(parentTaskId);
        
        const activityTask = {
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          instantiatesCanonical: `ActivityDefinition/${activityDefinition.id}`,
          partOf:[ 
            {
            reference: `Task/${parentTaskId}`
          }
        ],
          authoredOn: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          input: this.formatTaskInputs(inputData),
          // Store references to previous activities for context
          extension: [{
            url: 'http://our-system/previous-activities',
            valueString: JSON.stringify(
              completedActivities.map(task => ({
                id: task.id,
                definition: task.instantiatesCanonical.split('/')[1],
                status: task.status,
                outputs: this.formatTaskOutputsForContext(task.output)
              }))
            )
          }]
        };
    
        console.log('TaskMgr,Creating Activity Task:', JSON.stringify(activityTask, null, 2));

        const savedTask = await this.fhirClient.create(activityTask);
        
        await this.createProvenance(savedTask.id, 'activity-start', {
          parentTaskId,
          previousActivities: completedActivities.map(t => t.id)
        });
    
        return savedTask;
      }

  /**
   * Any time a Task's status changes or outputs are added, we update
   * the Task and record a Provenance entry. This creates a complete
   * audit trail we can use for recovery.
   */
  async updateTaskStatus(taskId, status, outputs = {}) {
    const task = await this.fhirClient.read('Task', taskId);
    
    task.status = status;
    task.lastModified = new Date().toISOString();
    task.output = this.formatTaskOutputs(outputs);

    const updatedTask = await this.fhirClient.update(task);
    
    await this.createProvenance(taskId, `task-${status}`, {
      outputs: Object.keys(outputs)
    });

    return updatedTask;
  }


  async initializeSystemDevice() {
    const deviceResource = {
      resourceType: 'Device',
      id: 'cori-workflow-engine',  // Use a fixed ID for the system device
      status: 'active',
      deviceName: [
        {
          name: 'Cori Workflow Engine',
          type: 'user-friendly-name'
        }
      ],
      type: {
        coding: [
          {
            system: 'http://corisystem.org/fhir/CodeSystem/device-types',
            code: 'workflow-engine',
            display: 'Workflow Engine'
          }
        ]
      }
    };
  
    try {
      await this.fhirClient.update(deviceResource);
    } catch (error) {
      if (error.response?.status === 404) {
        await this.fhirClient.create(deviceResource);
      } else {
        throw error;
      }
    }
    
    return deviceResource;
  }

 

  async cascadeDeleteTask(taskId, options = { force: false }) {
    const deletionService = new TaskDeletionService(
        this.fhirClient,
        this,
        this.activityExecutor,
        this.eventManager
    );

    return await deletionService.deleteTask(taskId, options);
}


async createProvenance(taskId, activityCode, details = {}) {
  const provenance = {
    resourceType: "Provenance",
    target: [
      {
        reference: `Task/${taskId}`
      }
    ],
    recorded: new Date().toISOString(),
    activity: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
          code: "CREATE",
          display: "create"
        }
      ]
    },
    agent: [
      {
        // Minimum required type for agent
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "author"
            }
          ]
        },
        // Just identify as the system without any resource reference
        who: {
          identifier: {
            system: "http://corisystem.org/workflow-engine",
            value: "workflow-system"
          }
        }
      }
    ]
  };

  console.log ("provenance: ", JSON.stringify(provenance));
  return this.fhirClient.create(provenance);
}



// ADD helper method
getActivityDisplay(code) {
  const displays = {
    'complex-workflow-start': 'Complex Workflow Started',
    'basic-workflow-start': 'Basic Workflow Started',
    'plan-start': 'Plan Started',
    'activity-start': 'Activity Started',
    'task-completed': 'Task Completed',
    'task-failed': 'Task Failed'
  };
  return displays[code] || code;
}

  /**
   * Helper to consistently format Task input data into the
   * FHIR-compliant structure.
   */
  formatTaskInputs(inputData) {
    return Object.entries(inputData).map(([key, value]) => ({
      type: { text: key },
      valueString: typeof value === 'string' ? value :
        JSON.stringify(value)
    }));
  }

  /**
   * Helper to consistently format Task output data into the
   * FHIR-compliant structure.
   */
  formatTaskOutputs(outputData) {
    return Object.entries(outputData).map(([key, value]) => ({
      type: { text: key },
      valueString: typeof value === 'string' ? value :
        JSON.stringify(value)
    }));
  }

  /**
   * Finds all Tasks that were in progress when the system
   * stopped. Used during startup to begin recovery.
   */
  async findInProgressTasks() {
    const response = await this.fhirClient.search('Task', {
      status: ['in-progress', 'requested'].join(',')
    });
    return response.entry?.map(e => e.resource) || [];
  }

  
  async getTaskExecutionCount(planId) {
    const response = await this.fhirClient.search('Task', {
        'instantiates-canonical': planId,
        status: 'completed'
    });
    return response.total || 0;
}


  /**
   * Given a Task ID, examines its Provenance history to reconstruct
   * what was happening when the system stopped. This helps us
   * decide how to resume execution.
   */
  async recoverTaskState(taskId) {
    const provenanceRecords = await this.fhirClient.search('Provenance', {
      target: `Task/${taskId}`,
      _sort: 'recorded'
    });

    const history = provenanceRecords.entry.map(entry => ({
      activity: entry.resource.activity.coding[0].code,
      timestamp: entry.resource.recorded,
      details: JSON.parse(entry.resource.extension[0].valueString)
    }));

    return {
      taskId,
      stateHistory: history,
      lastState: history[history.length - 1]
    };
  }


    /**
     * Gets all completed activity tasks that are part of this workflow.
     * Returns them in execution order based on Provenance records.
     */
    async getCompletedActivities(parentTaskId) {
      // First get all tasks that are part of this workflow
      const response = await this.fhirClient.search('Task', {
        'part-of': parentTaskId,
        status: 'completed'
      });
  
      if (!response.entry?.length) return [];
  
      const tasks = response.entry.map(e => e.resource);
      
      // For each task, get its start time from Provenance
      const taskTimings = await Promise.all(tasks.map(async task => {
        const startProvenance = await this.fhirClient.search('Provenance', {
          target: `Task/${task.id}`,
          'activity.code': 'activity-start'
        });
        return {
          task,
          startTime: startProvenance.entry?.[0]?.resource.recorded || task.authoredOn
        };
      }));
  
      // Sort by start time to get execution order
      return taskTimings
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .map(t => t.task);
    }
  

  
    /**
     * Helper to format task outputs into a structure that's easier
     * to reference in FHIRPath expressions
     */
    formatTaskOutputsForContext(outputs) {
      if (!outputs) return {};
      
      return outputs.reduce((acc, output) => {
        // Parse JSON values if they were stored as strings
        let value = output.valueString;
        try {
          value = JSON.parse(output.valueString);
        } catch (e) {
          // If it's not JSON, keep the original string
        }
        acc[output.type.text] = value;
        return acc;
      }, {});
    }
}

