import { writable, derived } from 'svelte/store';
export const currentView = writable('tasks');



function createWorkflowStore() {
  const { subscribe, set, update } = writable({
    nodes: [],
    edges: [],
    selectedNode: null
  });

  return {
    subscribe,
    addNode: (node) => update(state => ({
      ...state,
      nodes: [...state.nodes, node]
    })),
    updateNodePosition: (nodeId, position) => update(state => ({
      ...state,
      nodes: state.nodes.map(node => 
        node.id === nodeId ? { ...node, position } : node
      )
    })),
    removeNode: (nodeId) => update(state => ({
      ...state,
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    })),
    addEdge: (edge) => update(state => ({
      ...state,
      edges: [...state.edges, edge]
    })),
    removeEdge: (edgeId) => update(state => ({
      ...state,
      edges: state.edges.filter(e => e.id !== edgeId)
    })),
    setSelectedNode: (nodeId) => update(state => ({
      ...state,
      selectedNode: nodeId
    })),
    reset: () => set({ nodes: [], edges: [], selectedNode: null })
  };
}

export const workflowStore = createWorkflowStore();