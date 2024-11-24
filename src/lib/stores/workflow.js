import { writable } from 'svelte/store';
import { TaskGenerator } from '../taskServices.js';

const defaultState = {
  nodes: [],
  edges: [],
  tasks: [],
  eventDefinitions: [], // Added to track EventDefinitions
  properties: {}
};

function createWorkflowStore() {
  const { subscribe, update: storeUpdate, set } = writable(defaultState);
  let taskGenerator = new TaskGenerator();

  return {
    subscribe,

    update: () => {
      storeUpdate(workflow => {
        console.log('Forcing workflow update:', workflow);
        // Create new object reference to trigger reactivity
        return {
          ...workflow,
          lastUpdated: Date.now() // Add timestamp to force updates
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
          nodes: newNodes
        };
      });
    },

    addNode: (node) => {
      console.log('Adding node:', node);
      storeUpdate(workflow => {
        let newTasks = [];
        let newEventDef = null;

        if (node.type === 'event') {
          newEventDef = generateEventDefinition(node);
        }
        else if (node.type === 'activity') {
          const task = taskGenerator.generateTaskForActivity(node);
          newTasks = [task];
        }

        const updatedWorkflow = {
          ...workflow,
          nodes: [...workflow.nodes, node],
          tasks: [...(workflow.tasks || []), ...newTasks],
          eventDefinitions: newEventDef ? 
            [...(workflow.eventDefinitions || []), newEventDef] : 
            (workflow.eventDefinitions || []),
          lastUpdated: Date.now() // Add timestamp to force updates
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
      storeUpdate(workflow => ({
        ...workflow,
        edges: [...workflow.edges, edge],
        lastUpdated: Date.now() // Add timestamp to force updates
      }));
    },

    removeEdge: (edgeId) =>
      storeUpdate(workflow => ({
        ...workflow,
        edges: workflow.edges.filter(edge => edge.id !== edgeId)
      })),

      removeNode: (nodeId) => {
        storeUpdate(workflow => ({
          ...workflow,
          nodes: workflow.nodes.filter(n => n.id !== nodeId),
          edges: workflow.edges.filter(e => 
            e.source !== nodeId && e.target !== nodeId
          ),
          tasks: workflow.tasks.filter(t => 
            !t.id.includes(nodeId) && 
            !t.partOf?.[0]?.reference?.includes(nodeId)
          ),
          eventDefinitions: workflow.eventDefinitions.filter(e => 
            e.id !== nodeId
          )
        }));
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
        // First add child to container
        const updatedNodes = workflow.nodes.map(node => {
          if (node.id === containerId) {
            return {
              ...node,
              children: [...(node.children || []), child]
            };
          }
          return node;
        });

        // Then generate task for new child
        const containerTask = workflow.tasks.find(t => t.id === `task-${containerId}`);
        const childTask = taskGenerator.generateTaskForActivity(child, containerTask?.id);

        return {
          ...workflow,
          nodes: updatedNodes,
          tasks: [...workflow.tasks, ...(childTask ? [childTask] : [])]
        };
      });
    },

    reset: () => set(defaultState)
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
