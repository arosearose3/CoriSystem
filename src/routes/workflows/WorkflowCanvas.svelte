<script>
    import { onMount } from 'svelte';
    import { flowStore } from '$lib/stores/workflow';
    import FlowNode from './FlowNode.svelte';
    import FlowEdge from './FlowEdge.svelte';
    
    export let workflow;
    export let selectedElement;
    
    let canvasEl;
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
  
    onMount(() => {
      initializeCanvas();
    });
  
    function handleDrop(event) {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      const rect = canvasEl.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      
      addElementToWorkflow(data, position);
    }
  
    function addElementToWorkflow(element, position) {
      const newNode = {
        id: `node-${Date.now()}`,
        type: element.type,
        position,
        data: element
      };
      
      workflow = {
        ...workflow,
        nodes: [...workflow.nodes, newNode]
      };
    }
  
    function handleNodeSelect(node) {
      selectedElement = node;
    }
  </script>
  
  <div
    class="w-full h-full relative bg-white"
    bind:this={canvasEl}
    on:dragover|preventDefault
    on:drop|preventDefault={handleDrop}
  >
    {#each workflow.nodes as node}
      <FlowNode
        {node}
        on:select={() => handleNodeSelect(node)}
      />
    {/each}
    
    {#each workflow.edges as edge}
      <FlowEdge {edge} />
    {/each}
  </div>