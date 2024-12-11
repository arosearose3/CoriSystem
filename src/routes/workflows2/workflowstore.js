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
   // Configure outputs based on node type
// MODIFY existing addNode function:
addNode: (node) => update(state => {
  if (node.data.containerId) {
      return state;
  }

  node.data.inputs = node.data.inputs || [{  
    id: `${node.id}-input`,
    name: 'input',
    type: 'standard',
    position: 'left'
}];

  // Configure outputs based on node type
  if (node.type === 'event') {
      // KEEP existing event node handling
      node.data.outputs = [{
          id: `${node.id}-event-output`,
          type: 'standard',
          name: 'trigger',
          position: 'right'
      }];
  } else if (node.data.isResponseNode || // Check existing flag
             // ADD check for dynamicValue configuration
             node.data.dynamicValue?.some(dv => 
                 dv.path === '/Task/async/type' && 
                 dv.expression?.expression === 'approval'
             )) {
      // If we found a response path node, set the flag and dimensions
      node.data.isResponseNode = true;
      node.data.width = 240;
      node.data.height = 160;

      // Get valid responses from configuration if available
      let validResponses = ['approved', 'rejected'];
      if (node.data.dynamicValue) {
          const responsesConfig = node.data.dynamicValue.find(dv => 
              dv.path === '/Task/async/validResponses'
          );
          if (responsesConfig?.expression?.expression) {
              try {
                  validResponses = JSON.parse(responsesConfig.expression.expression);
              } catch (e) {
                  console.warn('Failed to parse validResponses, using defaults');
              }
          }
      }

      node.data.outputs = [
          {
              id: `${node.id}-sent`,
              name: 'sent',
              type: 'standard',
              position: 'bottom'
          },
          ...validResponses.map(response => ({
              id: `${node.id}-${response}`,
              name: response,
              type: 'response',
              responseValue: response,
              position: 'right'
          }))
      ];
  } else {
      // KEEP existing default output configuration
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

