export class TaskGenerator {
    constructor(serviceRequestId) {
      this.serviceRequestId = serviceRequestId;
    }
  
    generateTaskForActivity(activity, containerId = null) {
      const task = {
        resourceType: "Task",
        id: `task-${activity.id}`,
        status: "ready",
        intent: "order",
        priority: "routine",
        basedOn: [{
          reference: `ServiceRequest/${this.serviceRequestId}`
        }],
        focus: {
          reference: `ActivityDefinition/${activity.id}`
        },
        for: {
          reference: "Patient/example" // Would come from workflow context
        },
        authoredOn: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        executionPeriod: {
          start: new Date().toISOString()
        },
        // If this task is part of a container, reference the container task
        partOf: containerId ? [{
          reference: `Task/${containerId}`
        }] : undefined,
        // Map activity inputs to task inputs
        input: this.mapActivityInputsToTaskInputs(activity),
        // Map activity configuration to task restrictions
        restriction: {
          period: {
            start: new Date().toISOString()
          },
          recipient: activity.data?.assignedTo ? [{
            reference: `Practitioner/${activity.data.assignedTo}`
          }] : undefined
        }
      };
  
      return task;
    }
  
    generateContainerTask(containerNode) {
      const containerTask = {
        resourceType: "Task",
        id: `task-${containerNode.id}`,
        status: "ready",
        intent: "order",
        priority: "routine",
        basedOn: [{
          reference: `ServiceRequest/${this.serviceRequestId}`
        }],
        description: `${containerNode.type === 'parallel' ? 'Parallel' : 'Sequential'} Task Group`,
        authoredOn: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        executionPeriod: {
          start: new Date().toISOString()
        },
        // Specify how child tasks should be executed
        extension: [{
          url: "http://example.org/task-execution-type",
          valueCode: containerNode.type // 'parallel' or 'sequence'
        }],
        // Container-specific restrictions
        restriction: {
          period: {
            start: new Date().toISOString()
          }
        }
      };
  
      // Generate tasks for all children
      const childTasks = (containerNode.children || []).map(child => 
        this.generateTaskForActivity(child, containerTask.id)
      );
  
      return {
        containerTask,
        childTasks
      };
    }
  
    mapActivityInputsToTaskInputs(activity) {
      const inputs = [];
  
      // Map basic activity properties
      if (activity.data?.title) {
        inputs.push({
          type: {
            coding: [{
              system: "http://example.org/task-inputs",
              code: "title"
            }]
          },
          valueString: activity.data.title
        });
      }
  
      // Map activity-specific configuration
      if (activity.data?.config) {
        Object.entries(activity.data.config).forEach(([key, value]) => {
          inputs.push({
            type: {
              coding: [{
                system: "http://example.org/task-inputs",
                code: key
              }]
            },
            valueString: JSON.stringify(value)
          });
        });
      }
  
      // Add required resources
      if (activity.data?.requiredResources) {
        activity.data.requiredResources.forEach(resource => {
          inputs.push({
            type: {
              coding: [{
                system: "http://example.org/task-inputs",
                code: "required-resource"
              }]
            },
            valueReference: {
              reference: resource
            }
          });
        });
      }
  
      return inputs;
    }
  }

  