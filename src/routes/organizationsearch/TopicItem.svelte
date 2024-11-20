<script>
    import { fly } from 'svelte/transition';
  
    export let item;
    export let level = 1;
  
    function handleToggle() {
      item.expanded = !item.expanded;
      item = { ...item }; // Force reactivity
    }
  </script>
  
  <div class="accordion" style="padding-left: {level * 20}px;">
    <div
      class="topic-name"
      on:click={item.subtopics && item.subtopics.length > 0 && level <= 3 ? handleToggle : null}
    >
      <span>{item.name}</span>
      {#if item.subtopics && item.subtopics.length > 0 && level <= 3}
        <span class="icon">{item.expanded ? '▲' : '▼'}</span>
      {/if}
    </div>
  
    {#if item.expanded && item.subtopics}
      <div class="subtopics" transition:fly={{ y: 10, duration: 300 }}>
        {#each item.subtopics as subitem (subitem.taxonomyTerm)}
          <svelte:self item={subitem} level={level + 1} />
        {/each}
      </div>
    {/if}
  </div>
  
  <style>
    .accordion {
      margin-bottom: 5px;
    }
    .topic-name {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px;
      background-color: #f0f0f0;
      border-radius: 4px;
    }
    .icon {
      font-size: 0.8em;
    }
    .subtopics {
      margin-top: 5px;
    }
  </style>