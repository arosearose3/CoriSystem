<script>
    import { onMount } from "svelte";
  
    let toDoQuestionnaires = [];
    let completedQuestionnaires = [];
    let currentQuestionnaire = null;
    let currentResponse = null;
  
    // Stub handlers for API calls
    async function fetchAssignedQuestionnaires() {
      // Replace with actual API call
      toDoQuestionnaires = [
        { id: "1", name: "Consent Form", question: "Do you consent?" },
      ];
      completedQuestionnaires = [
        { id: "2", name: "Feedback Survey", question: "Was this helpful?" },
      ];
    }
  
    async function submitResponse(questionnaireId, response) {
      // Replace with actual API call
      completedQuestionnaires.push(
        toDoQuestionnaires.find((q) => q.id === questionnaireId)
      );
      toDoQuestionnaires = toDoQuestionnaires.filter(
        (q) => q.id !== questionnaireId
      );
      currentQuestionnaire = null;
    }
  
    function startQuestionnaire(questionnaire) {
      currentQuestionnaire = questionnaire;
      currentResponse = null;
    }
  
    onMount(fetchAssignedQuestionnaires);
  </script>
  
  <div class="user-questionnaires">
    <nav>
      <button on:click="{() => (currentQuestionnaire = null)}">To Do</button>
      <button on:click="{() => (currentQuestionnaire = null)}">Completed</button>
    </nav>
  
    {#if currentQuestionnaire}
      <div class="questionnaire-response">
        <h2>{currentQuestionnaire.name}</h2>
        <p>{currentQuestionnaire.question}</p>
        <label>
          <input type="radio" bind:group="{currentResponse}" value="yes" /> Yes
        </label>
        <label>
          <input type="radio" bind:group="{currentResponse}" value="no" /> No
        </label>
        <button
          on:click="{() => submitResponse(currentQuestionnaire.id, currentResponse)}"
          disabled="{!currentResponse}"
        >
          Submit
        </button>
        <button on:click="{() => (currentQuestionnaire = null)}">Cancel</button>
      </div>
    {:else}
      <div class="questionnaire-lists">
        <h2>To Do</h2>
        <ul>
          {#each toDoQuestionnaires as questionnaire}
            <li>
              <a href="#" on:click="{() => startQuestionnaire(questionnaire)}">{questionnaire.name}</a>
            </li>
          {/each}
        </ul>
  
        <h2>Completed</h2>
        <ul>
          {#each completedQuestionnaires as questionnaire}
            <li>{questionnaire.name}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  