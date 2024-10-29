<script>
  import { onMount } from 'svelte';
  export let currentPatientId;

  // Predefined achievement statuses
  const achievementStatuses = [
    "in-progress",
    "improving",
    "worsening",
    "no-change",
    "achieved",
    "sustaining",
    "not-achieved",
    "no-progress",
    "not-attainable"
  ];

  // SDOH categories as specified
  const sdohCategories = [
    { code: "food-insecurity", display: "Food Insecurity" },
    { code: "housing-instability", display: "Housing Instability" },
    { code: "homelessness", display: "Homelessness" },
    { code: "inadequate-housing", display: "Inadequate Housing" },
    { code: "transportation-insecurity", display: "Transportation Insecurity" },
    { code: "financial-insecurity", display: "Financial Insecurity" },
    { code: "material-hardship", display: "Material Hardship" },
    { code: "educational-attainment", display: "Educational Attainment" },
    { code: "employment-status", display: "Employment Status" },
    { code: "veteran-status", display: "Veteran Status" },
    { code: "stress", display: "Stress" },
    { code: "social-connection", display: "Social Connection" },
    { code: "intimate-partner-violence", display: "Intimate Partner Violence" },
    { code: "elder-abuse", display: "Elder Abuse" },
    { code: "personal-health-literacy", display: "Personal Health Literacy" },
    { code: "health-insurance-coverage-status", display: "Health Insurance Coverage Status" },
    { code: "medical-cost-burden", display: "Medical Cost Burden" },
    { code: "digital-literacy", display: "Digital Literacy" },
    { code: "digital-access", display: "Digital Access" },
    { code: "utility-insecurity", display: "Utility Insecurity" },
    { code: "sdoh-category-unspecified", display: "SDOH Category Unspecified" }
  ];

  let newGoal = {
    achievementStatus: "",
    description: "",
    category: [],
    subject: { reference: `Patient/${currentPatientId}` },
    statusDate: "",
    outcomeCode: ""
  };

  let selectedCategories = [];
  
  async function  handleSubmit() {
    newGoal.category = selectedCategories.map(code => ({ coding: [{ code }] }));
    
    console.log('Submitting new goal:', newGoal);

    try {
      const response = await fetch('/avail/api/goal/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newGoal)
      });

      if (response.ok) {
        alert('Goal created successfully');
      } else {
        console.error('Failed to create goal:', await response.text());
        alert('Failed to create goal');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Error creating goal');
    }
  }
</script>

<div class="add-goal-form">
  <h2>Add New Goal</h2>

  <form on:submit|preventDefault={handleSubmit}>
    <label for="description">Goal Description:</label>
    <input type="text" id="description" bind:value={newGoal.description} required placeholder="Enter goal description" />

    <label for="achievementStatus">Achievement Status:</label>
    <select id="achievementStatus" bind:value={newGoal.achievementStatus}>
      <option value="">Select Status</option>
      {#each achievementStatuses as status}
        <option value={status}>{status}</option>
      {/each}
    </select>

    <label>SDOH Categories:</label>
    <div class="categories">
      {#each sdohCategories as category}
        <div class="category">
          <input type="checkbox" id={category.code} value={category.code} bind:group={selectedCategories} />
          <label for={category.code} title={category.display}>{category.display}</label>
        </div>
      {/each}
    </div>

    <label for="statusDate">Status Date:</label>
    <input type="date" id="statusDate" bind:value={newGoal.statusDate} />

    <label for="outcomeCode">Outcome Code:</label>
    <input type="text" id="outcomeCode" bind:value={newGoal.outcomeCode} placeholder="Outcome code (optional)" />

    <button type="submit">Submit Goal</button>
  </form>
</div>

<style>
  .add-goal-form {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  label {
    font-weight: bold;
  }

  input, select {
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .category {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  button {
    padding: 10px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }

  button:hover {
    background-color: #0056b3;
  }
</style>
