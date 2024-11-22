import { writable } from 'svelte/store';

function createFlowStore() {
  const { subscribe, set, update } = writable({
    executing: false,
    currentNode: null,
    executionPath: [],
    parallelTasks: new Map(),
    conditions: new Map()
  });

  return {
    subscribe,
    startExecution: (startNode) => update(state => ({
      ...state,
      executing: true,
      currentNode: startNode,
      executionPath: [startNode]
    })),
    completeNode: (nodeId) => update(state => {
      const nextNode = getNextNode(nodeId);
      return {
        ...state,
        currentNode: nextNode,
        executionPath: [...state.executionPath, nextNode]
      };
    }),
    addParallelTask: (taskId, task) => update(state => {
      const tasks = new Map(state.parallelTasks);
      tasks.set(taskId, task);
      return {
        ...state,
        parallelTasks: tasks
      };
    }),
    setCondition: (conditionId, result) => update(state => {
      const conditions = new Map(state.conditions);
      conditions.set(conditionId, result);
      return {
        ...state,
        conditions
      };
    })
  };
}

export const flowStore = createFlowStore();