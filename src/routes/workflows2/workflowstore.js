import { writable, derived } from 'svelte/store';
export const currentView = writable('tasks');



function extractInputsFromDynamicValues(dynamicValues) {
  const inputs = new Map();
  
  dynamicValues?.forEach(dv => {
      if (dv.path.includes('/Task/input[')) {
          const match = dv.path.match(/input\[(.*?)\]/);
          if (!match) return;
          
          const inputName = match[1];
          if (!inputs.has(inputName)) {
              inputs.set(inputName, {
                  name: inputName,
                  type: 'standard',
                  dataType: 'string',
                  definedAtCreation: false
              });
          }
          
          const pathEnd = dv.path.split('/').pop();
          const input = inputs.get(inputName);
          
          switch(pathEnd) {
              case 'type':
                  input.dataType = dv.expression.expression;
                  break;
              case 'definedAt':
                  input.definedAtCreation = dv.expression.expression === 'Template Creation';
                  break;
              case 'value':
                  if (input.definedAtCreation) {
                      input.value = dv.expression.expression;
                  }
                  break;
          }
      }
  });
  
  return Array.from(inputs.values());
}

function createWorkflowStore() {
    const { subscribe, set, update } = writable({
      nodes: [],
      edges: [],
      selectedNode: null,
      planData: {
        name: '',
        title: '',
        subtitle: '',
        description: '',
        purpose: '',
        usage: '',
        author: ''
      }
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


// workflowstore.js - REPLACE addNode function:
addNode: (node) => update(state => {
  // Skip nodes that belong in containers
  if (node.data.containerId) {
      return state;
  }

  // Extract inputs from dynamic values if present
  if (node.data.dynamicValue) {
      node.data.inputs = extractInputsFromDynamicValues(node.data.dynamicValue);
  }

  // Calculate base node height based on content
  const baseHeight = 80;  // Minimum height for title and basic content
  const inputHeight = 40; // Height needed per input
  const inputCount = node.data.inputs?.length || 0;
  
  // Calculate total height needed
  let totalHeight = baseHeight;
  if (inputCount > 0) {
      totalHeight += (inputCount * inputHeight);
  }

  // Special handling for event nodes
  if (node.type === 'event') {
      // Events start with no outputs by default
      node.data.inputs = [];
      node.data.outputs = [];
      
      // If this event has payload/output data from its configuration,
      // add an output port for it
      if (node.data.eventOutput) {
          node.data.outputs = [{
              id: `${node.id}-output`,
              name: 'output',
              type: 'standard',
              position: 'right',
              dataType: node.data.eventOutput.type
          }];
      }
  }

  // Handle response path nodes
  else if (node.data.isResponseNode || 
           node.data.dynamicValue?.some(dv => 
               dv.path === '/Task/async/type' && 
               dv.expression?.expression === 'approval'
           )) {
      // Set response node properties
      node.data.isResponseNode = true;
      node.data.width = 240;
      totalHeight = Math.max(totalHeight, 160); // Ensure minimum height for response nodes
      
      // Parse valid responses from configuration
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

      // Configure outputs for response node
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
  }
  // Handle regular activity nodes
  else {
      // Ensure all inputs have IDs
      if (node.data.inputs?.length) {
          node.data.inputs = node.data.inputs.map(input => ({
              ...input,
              id: `${node.id}-${input.name}`
          }));
      }

      // Add standard output
      node.data.outputs = [{
          id: `${node.id}-output`,
          name: 'output',
          type: 'standard',
          position: 'right'
      }];
  }

  // Set the final calculated height
  node.data.height = totalHeight;

  // Add the node to the state
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
  
          // Check if this response path already has a connection
          const existingEdge = state.edges.find(e => 
              e.source === edge.source && 
              e.sourcePort === edge.sourcePort
          );
          
          if (existingEdge) {
              console.warn('Response path already connected');
              return state;
          }
      }
  
      return {
          ...state,
          edges: [...state.edges, edge]
      };
  }),

    updatePlanData: (data) => update(state => ({
      ...state,
      planData: { ...state.planData, ...data }
    })),

    updatePlanProperties: (properties) => update(state => ({
      ...state,
      planProperties: { ...state.planProperties, ...properties }
    })),
    
    getPlanProperties: () => get(store).planProperties,

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

