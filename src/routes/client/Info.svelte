<script>
    import GoalsList from './GoalsList.svelte';
    import ConditionsList from './ConditionsList.svelte';
    import AddGoalForm from './AddGoalForm.svelte'; // Assuming you have AddGoalForm component
    import AddConditionForm from './AddConditionForm.svelte'; // Assuming you have AddConditionForm component
  
    export let currentPatientId;
    export let currentPractitionerId;
  
    let showGoalForm = false;
    let showConditionForm = false;
  
    function addGoal() {
      showGoalForm = true;
      showConditionForm = false;
    }
  
    function addCondition() {
      showGoalForm = false;
      showConditionForm = true;
    }
  </script>
  
  <div class="info-section">
    {#if showGoalForm}
      <!-- Display the Add Goal form -->
      <AddGoalForm {currentPatientId} {currentPractitionerId} />
    {:else if showConditionForm}
      <!-- Display the Add Condition form -->
      <AddConditionForm {currentPatientId} {currentPractitionerId} />
    {:else}
      <!-- Default view with Goals and Conditions lists -->
      <h4>Goals</h4>
      <h5>"I want the patient to achieve (or sustain) some measured state, possibly in a particular timeframe."</h5>


      <button on:click={addGoal}>Add Goal</button>
      <GoalsList {currentPatientId} {currentPractitionerId} />
  
      <h4>Conditions</h4>
      <h5>"This is an issue/situation/challenge the patient has."</h5>
      <button on:click={addCondition}>Add Condition</button>
      <ConditionsList {currentPatientId} {currentPractitionerId} />
    {/if}
  </div>
  
  <style>
    .info-section {
  
    }
  
    button {
      padding: 10px;
      margin-bottom: 15px;
      background-color: #007bff;
      color: white;
      border: none;
      cursor: pointer;
    }
  
    button:hover {
      background-color: #0056b3;
    }
  </style>
  