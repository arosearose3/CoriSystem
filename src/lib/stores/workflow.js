import { writable } from 'svelte/store';

function createWorkflowStore() {
  const { subscribe, set, update } = writable({
    nodes: [],
    edges: [],
    properties: {}
  });

  return {
    subscribe,
    addNode: (node) => update(wf => ({
      ...wf,
      nodes: [...wf.nodes, node]
    })),
    updateNode: (id, changes) => update(wf => ({
      ...wf,
      nodes: wf.nodes.map(n => n.id === id ? { ...n, ...changes } : n)
    })),
    addEdge: (edge) => update(wf => ({
      ...wf,
      edges: [...wf.edges, edge]
    })),
    removeNode: (id) => update(wf => ({
      ...wf,
      nodes: wf.nodes.filter(n => n.id !== id),
      edges: wf.edges.filter(e => e.source !== id && e.target !== id)
    }))
  };
}

export const workflowStore = createWorkflowStore();