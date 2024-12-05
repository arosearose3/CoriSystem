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
    updateNode: (nodeId, nodeData) => update(state => ({
      ...state,
      nodes: state.nodes.map(node =>
        node.id === nodeId ? { ...node, ...nodeData } : node
      )
    })),
    updateNodeCondition: (nodeId, condition) => update(state => ({
      ...state,
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, condition } }
          : node
      )
    })),
    addNode: (node) => update(state => {
      // Don't add nodes that belong in containers to the main canvas
      if (node.data.containerId) {
        return state;
      }
      return {
        ...state,
        nodes: [...state.nodes, node]
      };
    }),

    addContainedNode: (containerId, childNode) => update(state => {
      const updatedNodes = state.nodes.map(n => {
        if (n.id === containerId) {
          return {
            ...n,
            children: [...(n.children || []), childNode]
          };
        }
        return n;
      });
      
      return {
        ...state,
        nodes: updatedNodes
      };
    }),
    updateNodePosition: (nodeId, position) => update(state => ({
      ...state,
      nodes: state.nodes.map(node => 
        node.id === nodeId ? { ...node, position } : node
      )
    })),
    removeNode: (nodeId) => update(state => {
      // Remove from parent if it's a child node
      const updatedNodes = state.nodes.map(n => {
        if (n.children) {
          return {
            ...n,
            children: n.children.filter(child => child.id !== nodeId)
          };
        }
        return n;
      });

      // Remove the node itself and any children it might have
      return {
        ...state,
        nodes: updatedNodes.filter(n => n.id !== nodeId),
        edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
      };
    }),
    removeFromContainer: (containerId, childId) => update(state => {
      const updatedNodes = state.nodes.map(n => {
        if (n.id === containerId) {
          return {
            ...n,
            children: (n.children || []).filter(child => child.id !== childId)
          };
        }
        return n;
      });
      
      return {
        ...state,
        nodes: updatedNodes
      };
    }),
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