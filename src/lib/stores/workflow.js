import { writable } from 'svelte/store';

const defaultState = {
  nodes: [],
  edges: [],
  properties: {}
};

function createWorkflowStore() {
  const { subscribe, update: storeUpdate, set } = writable(defaultState);

  return {
    subscribe,

    update: () => {
      storeUpdate(workflow => ({ ...workflow }));
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
      console.log('Store: adding node', node);
      storeUpdate(workflow => ({
        ...workflow,
        nodes: [...workflow.nodes, node]
      }));
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

    updateElement: (id, changes) =>
      storeUpdate(workflow => ({
        ...workflow,
        nodes: workflow.nodes.map(node =>
          node.id === id
            ? { ...node, ...changes }
            : node
        )
      })),

    addEdge: (edge) =>
      storeUpdate(workflow => ({
        ...workflow,
        edges: [...workflow.edges, edge]
      })),

    removeEdge: (edgeId) =>
      storeUpdate(workflow => ({
        ...workflow,
        edges: workflow.edges.filter(edge => edge.id !== edgeId)
      })),

    removeNode: (id) =>
      storeUpdate(workflow => ({
        ...workflow,
        nodes: workflow.nodes.filter(node => node.id !== id),
        edges: workflow.edges.filter(edge => 
          edge.source !== id && edge.target !== id
        )
      })),

    reset: () => set(defaultState)
  };
}

export const workflowStore = createWorkflowStore();
export const selectedElementStore = writable(null);