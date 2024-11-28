<script>
    import { onMount } from "svelte";
  
    let questionnaires = [];
    let isAdding = false;
    let currentQuestionnaire = null;
    let previewResource = {};
  
    // Stub handlers for API calls
    async function fetchQuestionnaires() {
      // Replace with actual API call
      questionnaires = [
        { id: "1", name: "Consent Form", status: "active" },
        { id: "2", name: "Feedback Survey", status: "retired" },
      ];
    }
  
    async function saveQuestionnaire(questionnaire) {
      // Replace with actual API call
      if (!questionnaire.id) {
        questionnaire.id = String(Date.now());
        questionnaires.push(questionnaire);
      } else {
        const index = questionnaires.findIndex((q) => q.id === questionnaire.id);
        questionnaires[index] = questionnaire;
      }
      isAdding = false;
    }
  
    function startNewQuestionnaire() {
      currentQuestionnaire = {
        resourceType: "Questionnaire",
        id: "",
        name: "",
        status: "draft",
        item: [
          {
            linkId: "1",
            type: "choice",
            text: "",
            answerOption: [
              { valueCoding: { code: "yes", display: "Yes" } },
              { valueCoding: { code: "no", display: "No" } },
            ],
          },
        ],
      };
      isAdding = true;
      updatePreview();
    }
  
    function editQuestionnaire(questionnaire) {
      currentQuestionnaire = { ...questionnaire };
      isAdding = true;
      updatePreview();
    }
  
    function updatePreview() {
      if (currentQuestionnaire) {
        previewResource = JSON.parse(JSON.stringify(currentQuestionnaire));
      }
    }
  
    onMount(fetchQuestionnaires);
  </script>
  
  {#if isAdding}
    <div class="questionnaire-editor">
      <h2>{currentQuestionnaire?.id ? "Edit Questionnaire" : "New Questionnaire"}</h2>
      <label>Name</label>
      <input type="text" bind:value="{currentQuestionnaire.name}" on:input="{updatePreview}" />
  
      <h3>Design Questions</h3>
      <div>
        <label>Yes/No Question:</label>
        <input
          type="text"
          placeholder="Enter question text"
          bind:value="{currentQuestionnaire.items[0].text}"
          on:input="{updatePreview}"
        />
      </div>
  
      <h3>Preview</h3>
      <textarea readonly style="width: 100%; height: 150px;">{JSON.stringify(previewResource, null, 2)}</textarea>
      <button on:click="{updatePreview}">Update Preview</button>
  
      <button on:click="{() => saveQuestionnaire(currentQuestionnaire)}">Save</button>
      <button on:click="{() => (isAdding = false)}">Cancel</button>
    </div>
  {:else}
    <div class="questionnaire-list">
      <h2>Questionnaires</h2>
      <ul>
        {#each questionnaires as questionnaire}
          <li>
            <a href="#" on:click="{() => editQuestionnaire(questionnaire)}">{questionnaire.name}</a>
            ({questionnaire.status})
          </li>
        {/each}
      </ul>
      <button on:click="{startNewQuestionnaire}">New Questionnaire</button>
    </div>
  {/if}
  