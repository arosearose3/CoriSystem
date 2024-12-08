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
      nodes: state.nodes.map(node => {
        if (node.id === nodeId) {
          // Preserve existing outputs if they're not being updated
          const outputs = nodeData.outputs || node.data.outputs || [];
          return {
            ...node,
            ...nodeData,
            data: {
              ...node.data,
              ...nodeData.data,
              outputs
            }
          };
        }
        return node;
      })
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
      if (node.data.containerId) {
        return state;
      }

      // Configure outputs based on node type
      if (node.data.isResponseNode) {
        node.data.outputs = [
          {
            id: `${node.id}-output`,
            name: 'sent',
            type: 'standard',
            position: 'bottom'
          },
          {
            id: `${node.id}-approved`,
            name: 'approved',
            type: 'response',
            responseValue: 'approved',
            position: 'right'
          },
          {
            id: `${node.id}-rejected`,
            name: 'rejected',
            type: 'response',
            responseValue: 'rejected',
            position: 'right'
          }
        ];
      } else {
        node.data.outputs = [
          {
            id: `${node.id}-output`,
            name: 'output',
            type: 'standard',
            position: 'right'
          }
        ];
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
    addEdge: (edge) => update(state => {
      // Find the source node and output
      const sourceNode = state.nodes.find(n => n.id === edge.source);
      const sourceOutput = sourceNode?.data.outputs?.find(o => o.id === edge.sourcePort);

      // If this is a response connection, add response metadata
      if (sourceOutput?.type === 'response') {
        edge.responseValue = sourceOutput.responseValue;
        edge.isResponsePath = true;
      }

      return {
        ...state,
        edges: [...state.edges, edge]
      };
    }),
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

export const responseNodes = derived(workflowStore, $store => 
  $store.nodes.filter(node => node.data.isResponseNode)
);

export const responseEdges = derived(workflowStore, $store =>
  $store.edges.filter(edge => edge.isResponsePath)
);

