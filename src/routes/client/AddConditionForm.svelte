<script>
  import { onMount } from 'svelte';

  export let currentPatientId;
  export let currentPractitionerId;

  let selectedCondition = ''; // Holds the selected condition code
  let clinicalStatus = ''; // Holds selected clinical status
  let verificationStatus = ''; // Holds selected verification status
  let recordedDate = ''; // Holds the recorded date

  const conditionOptions = [
      { label: 'Digital Access Diagnoses', code: 'digital-access' },
      { label: 'Digital Literacy Diagnoses', code: 'digital-literacy' },
      { label: 'Less Than High School Education Diagnoses', code: 'educational-attainment' },
      { label: 'Elder Abuse Diagnoses', code: 'elder-abuse' },
      { label: 'Unemployment Diagnoses', code: 'employment-status' },
      { label: 'Financial Insecurity Diagnoses', code: 'financial-insecurity' },
      { label: 'Food Insecurity Diagnoses', code: 'food-insecurity' },
      { label: 'Health Insurance Coverage Status Diagnoses', code: 'health-insurance-coverage-status' },
      { label: 'Homelessness Diagnoses', code: 'homelessness' },
      { label: 'Housing Instability Diagnoses', code: 'housing-instability' },
      { label: 'Inadequate Housing Diagnoses', code: 'inadequate-housing' },
      { label: 'Intimate Partner Violence Diagnoses', code: 'intimate-partner-violence' },
      { label: 'Material Hardship Diagnoses', code: 'material-hardship' },
      { label: 'Medical Cost Burden Diagnoses', code: 'medical-cost-burden' },
      { label: 'Health Literacy Diagnoses', code: 'personal-health-literacy' },
      { label: 'Social Connection Diagnoses', code: 'social-connection' },
      { label: 'Stress Diagnoses', code: 'stress' },
      { label: 'Transportation Insecurity Diagnoses', code: 'transportation-insecurity' },
      { label: 'Utility Insecurity Diagnoses', code: 'utility-insecurity' },
      { label: 'Veteran Status Diagnoses', code: 'veteran-status' },
      { label: 'US Core Condition Code', code: 'sdoh-category-unspecified' }
  ];

  const clinicalStatusOptions = [
      'active',
      'recurrence',
      'relapse',
      'inactive',
      'remission',
      'resolved'
  ];

  const verificationStatusOptions = [
      'unconfirmed',
      'provisional',
      'differential',
      'confirmed',
      'refuted',
      'entered-in-error'
  ];

  function getFormattedDate() {
      const now = new Date();
      const timezoneOffset = -now.getTimezoneOffset();
      const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
      const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
      const offsetSign = timezoneOffset >= 0 ? '+' : '-';
      const formattedDate = now.toISOString().split('.')[0]; 
      return `${formattedDate}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  // Prepare Condition resource
  async function createCondition() {
      const conditionResource = {
          resourceType: 'Condition',
          clinicalStatus: {
              coding: [
                  {
                      system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                      code: clinicalStatus
                  }
              ]
          },
          verificationStatus: {
              coding: [
                  {
                      system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                      code: verificationStatus
                  }
              ]
          },
          code: {
              coding: [
                  {
                      system: 'http://hl7.org/fhir/us/sdoh-clinicalcare/CodeSystem/SDOHCC-CodeSystemTemporaryCodes',
                      code: selectedCondition,
                      display: conditionOptions.find(option => option.code === selectedCondition)?.label || 'Unknown Condition'
                  }
              ]
          },
          category: [
              {
                  coding: [
                      {
                          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                          code: 'problem-list-item',
                          display: 'Problem List Item'
                      }
                  ]
              }
          ],
          subject: { reference: `Patient/${currentPatientId}` },
          recorder: { reference: `Practitioner/${currentPractitionerId}` },
          asserter: { reference: `Practitioner/${currentPractitionerId}` },
          recordedDate: getFormattedDate(),
      };

      console.log("in Add Condition, resource:" + JSON.stringify(conditionResource));

      try {
          const response = await fetch('/avail/api/condition/add', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(conditionResource)
          });

          if (response.ok) {
              alert('Condition created successfully');
          } else {
              console.error('Failed to create condition:', await response.text());
              alert('Failed to create condition');
          }
      } catch (error) {
          console.error('Error creating condition:', error);
          alert('Error creating condition');
      }
  }

  // Submit handler for form submission
  function handleSubmit() {
      if (!selectedCondition || !clinicalStatus || !verificationStatus) {
          alert('Please fill all fields');
          return;
      }
      createCondition();
  }
</script>

<div class="condition-form">
<h3>Add Condition</h3>

<fieldset>
  <legend>Select a Condition:</legend>
  {#each conditionOptions as option}
    <div class="condition-option">
      <input type="radio" bind:group={selectedCondition} value={option.code} id={option.code} />
      <label for={option.code}>{option.label}</label>
    </div>
  {/each}
</fieldset>

<fieldset>
  <legend>Select Clinical Status:</legend>
  <select bind:value={clinicalStatus}>
    <option value="">-- Select Clinical Status --</option>
    {#each clinicalStatusOptions as status}
      <option value={status}>{status}</option>
    {/each}
  </select>
</fieldset>

<fieldset>
  <legend>Select Verification Status:</legend>
  <select bind:value={verificationStatus}>
    <option value="">-- Select Verification Status --</option>
    {#each verificationStatusOptions as status}
      <option value={status}>{status}</option>
    {/each}
  </select>
</fieldset>

<button on:click={handleSubmit}>Submit Condition</button>
</div>

<style>
.condition-form {
  padding: 20px;
}

fieldset {
  margin-bottom: 15px;
}

.condition-option {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.condition-option label {
  margin-left: 10px;
}

select {
  padding: 5px;
  margin-bottom: 15px;
  width: 100%;
}

button {
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>
