import { writable } from 'svelte/store';
import { TaskGenerator } from '../taskServices.js';

const defaultState = {
  nodes: [],
  edges: [],
  tasks: [],
  eventDefinitions: [],
  properties: {},
  name: "Default Workflow", // Added default name
  lastUpdated: Date.now() ,  // Added timestamp
  debug:false
};

function createWorkflowStore() {
  const { subscribe, update: storeUpdate, set } = writable({
    ...defaultState,
    structuralChange: false
  });
  let taskGenerator = new TaskGenerator();

  return {
    subscribe,

    update: () => {
      // CHANGED: Added immediate callback
      storeUpdate(workflow => {
        console.log('Forcing workflow update, current nodes:', workflow.nodes);
        return {
          ...workflow,
          lastUpdated: Date.now()
        };
      });
    },

    initializeWorkflow: (serviceRequestId) => {
      taskGenerator = new TaskGenerator(serviceRequestId);
      storeUpdate(workflow => ({
        ...workflow,
        serviceRequestId,
        tasks: []
      }));
    },

    updateNodePosition: (nodeId, position) => {
      storeUpdate(workflow => {
        const newNodes = workflow.nodes.map(node =>
          node.id === nodeId
            ? { ...node, position: { ...position } }
            : node
        );
        return {
          ...workflow,
          nodes: newNodes,
          structuralChange: false // Position updates are not structural changes
        };
      });
    },

    addNode: (node) => {
      console.log('Adding node:', node);
      storeUpdate(workflow => {
        // Ensure arrays exist
        const currentNodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
        const currentTasks = Array.isArray(workflow.tasks) ? workflow.tasks : [];
        const currentEventDefs = Array.isArray(workflow.eventDefinitions) ? 
          workflow.eventDefinitions : [];
    
        let newTasks = [];
        let newEventDef = null;
    
        // Handle events
        if (node.type === 'event' || node.data?.isEvent) {
          newEventDef = generateEventDefinition(node);
        } else if (node.type === 'activity' || node.data?.isActivity) {
          const task = taskGenerator.generateTaskForActivity(node);
          if (task) newTasks = [task];
        }
    
        const updatedWorkflow = {
          ...workflow,
          nodes: [...currentNodes, node],
          tasks: [...currentTasks, ...newTasks],
          eventDefinitions: newEventDef ? 
            [...currentEventDefs, newEventDef] : 
            currentEventDefs,
          structuralChange: true,
          lastUpdated: Date.now()
        };
    
        console.log('Updated workflow:', updatedWorkflow);
        return updatedWorkflow;
      });
    },

    updateNode: (id, changes) =>
      storeUpdate(workflow => ({
        ...workflow,
        nodes: workflow.nodes.map(node =>
          node.id === id
            ? { ...node, ...changes }
            : node
        )
      })),

    updateElement: (id, changes) => {
      storeUpdate(workflow => ({
        ...workflow,
        nodes: workflow.nodes.map(node =>
          node.id === id
            ? { ...node, ...changes }
            : node
        )
      }));
    },

    addEdge: (edge) => {
      console.log('Adding edge:', edge);
      storeUpdate(workflow => {
        const updatedWorkflow = {
          ...workflow,
          edges: [...workflow.edges, edge],
          structuralChange: true, // Adding an edge is a structural change
          lastUpdated: Date.now()
        };
        console.log('Updated workflow after adding edge:', updatedWorkflow);
        return updatedWorkflow;
      });
    },

    removeEdge: (edgeId) =>
      storeUpdate(workflow => ({
        ...workflow,
        edges: workflow.edges.filter(edge => edge.id !== edgeId),
        structuralChange: true // Removing an edge is a structural change
      })),



      removeNode: (nodeId) => {
        storeUpdate(workflow => {
          // Remove the node
          const updatedNodes = workflow.nodes.filter(n => n.id !== nodeId);
          
          // Remove any edges connected to this node
          const updatedEdges = workflow.edges.filter(e => 
            e.source !== nodeId && e.target !== nodeId
          );
          
          // Remove associated tasks
          const updatedTasks = workflow.tasks.filter(t => 
            !t.id.includes(nodeId) && 
            !t.partOf?.[0]?.reference?.includes(nodeId)
          );
          
          // Remove from event definitions if it was an event
          const updatedEventDefs = workflow.eventDefinitions.filter(e => 
            e.id !== nodeId
          );
  
          return {
            ...workflow,
            nodes: updatedNodes,
            edges: updatedEdges,
            tasks: updatedTasks,
            eventDefinitions: updatedEventDefs,
            structuralChange: true
          };
        });
      },

    addChild: (parentId, child) => {
      storeUpdate(workflow => {
        const updatedNodes = workflow.nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...(node.children || []), child]
            };
          }
          return node;
        });

        return {
          ...workflow,
          nodes: updatedNodes
        };
      });
    },

    removeChildFromContainer: (parentId, childId) => {
      storeUpdate(workflow => {
        const updatedNodes = workflow.nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: (node.children || []).filter(child => child.id !== childId)
            };
          }
          return node;
        });

        // Remove any associated tasks
        const updatedTasks = workflow.tasks.filter(task => 
          !task.id.includes(childId) && 
          !task.partOf?.[0]?.reference?.includes(childId)
        );

        return {
          ...workflow,
          nodes: updatedNodes,
          tasks: updatedTasks,
          structuralChange: true
        };
      });
    },


    removeChild: (parentId, childId) => {
      storeUpdate(workflow => {
        const updatedNodes = workflow.nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: (node.children || []).filter(c => c.id !== childId)
            };
          }
          return node;
        });

        return {
          ...workflow,
          nodes: updatedNodes
        };
      });
    },

    addChildToContainer: (containerId, child) => {
      storeUpdate(workflow => {
        console.log('Adding child to container:', containerId, child);
        
        // First add child to container
        const updatedNodes = workflow.nodes.map(node => {
          if (node.id === containerId) {
            const updatedNode = {
              ...node,
              children: [...(node.children || []), child]
            };
            console.log('Updated container node:', updatedNode);
            return updatedNode;
          }
          return node;
        });
    
        // Generate task for the child if needed
        let newTasks = [];
        if (child.type === 'activity') {
          const containerTask = workflow.tasks.find(t => t.id === `task-${containerId}`);
          const childTask = taskGenerator.generateTaskForActivity(child, containerTask?.id);
          if (childTask) {
            newTasks = [childTask];
          }
        }
    
        const updatedWorkflow = {
          ...workflow,
          nodes: updatedNodes,
          tasks: [...workflow.tasks, ...newTasks],
          structuralChange: true
        };
        
        console.log('Updated workflow after adding child:', updatedWorkflow);
        return updatedWorkflow;
      });
    },

    reset: () => set({
      ...defaultState,
      structuralChange: true
    })
  };
}

function generateEventDefinition(eventNode) {
  return {
    resourceType: "EventDefinition",
    id: eventNode.id,
    status: "active",
    trigger: [{
      type: "named-event",
      name: eventNode.data?.eventType || "fhir-resource-changed",
      data: [{
        type: eventNode.data?.resourceType || "Resource",
        profile: eventNode.data?.profile ? 
          [`http://hl7.org/fhir/StructureDefinition/${eventNode.data.profile}`] : 
          undefined,
        changeType: eventNode.data?.changeTypes || ["create", "update", "delete"]
      }]
    }]
  };
}

export const workflowStore = createWorkflowStore();
export const selectedElementStore = writable(null);
