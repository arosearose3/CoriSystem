<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    import TopicItem from './TopicItem.svelte';
  
    let topics = [];
    let error = null;
    let showAll = false;
  
    // Fetch topics and subtopics from the API
    async function fetchBigTopics() {
      try {
        const response = await fetch(`${base}/api/api211/getTopicsAndSubtopics`);
        if (!response.ok) {
          throw new Error('Failed to fetch topics and subtopics');
        }
        topics = await response.json();
        initializeExpandedState(topics);
        topics = [...topics]; // Force reactivity
      } catch (err) {
        error = err.message;
      }
    }
  
    // Initialize the expanded state for each topic and subtopic
    function initializeExpandedState(items) {
      items.forEach(item => {
        item.expanded = showAll;
        if (item.subtopics) {
          initializeExpandedState(item.subtopics);
        }
      });
    }
  
    // Toggle state for showing all or only top-level topics
    function toggleAll(state) {
      showAll = state;
      topics = topics.map(item => updateItemExpanded(item, state));
    }
  
    function updateItemExpanded(item, state) {
      const newItem = { ...item, expanded: state };
      if (item.subtopics) {
        newItem.subtopics = item.subtopics.map(subitem => updateItemExpanded(subitem, state));
      }
      return newItem;
    }
  
    // Fetch the topics when the component mounts
    onMount(() => {
      fetchBigTopics();
    });
  </script>
  
  {#if error}
    <div class="error">{error}</div>
  {:else if topics.length === 0}
    <p>Loading topics...</p>
  {:else}
    <div class="container">
      <!-- Buttons to control visibility -->
      <div class="buttons">
        <button on:click={() => toggleAll(true)}>Show All</button>
        <button on:click={() => toggleAll(false)}>Close All</button>
      </div>
  
      <!-- Display topics using the TopicItem component -->
      {#each topics as topic (topic.taxonomyTerm)}
        <TopicItem item={topic} level={1} />
      {/each}
    </div>
  {/if}
  
  <style>
    /* Add your styles here */
  </style>
  