<script>
  import { onMount } from 'svelte';
  import PickOrg from './PickOrg.svelte';
  export let currentPatientId;
  export let currentPractitionerId;
  let referrals = [];
  let showForm = false;

  // Form state for ServiceRequest
let serviceRequestData = {
  "resourceType": "ServiceRequest",
  "status": 'draft',
  "intent": 'proposal',
  "code": {
    coding: [],   // Coding will hold an array of objects representing the coding system
    text: ''      // Display text for the code (e.g., 'Food Insecurity')
  },
  "subject": {
    reference: `Patient/${currentPatientId}`,
    type: "Patient",
    display: 'patient name here'   // Optional display field (e.g., 'John Doe')
  },
  "requester": {
    reference: `Practitioner/${currentPractitionerId}`,   // Can also be an Organization
    type: "Practitioner",                                // Use "Organization" if referencing an organization
    display: 'requester here'    // Optional display text for requester (e.g., 'Dr. Jane Doe')
  },
  "performer": [                                         // Performer is an array of references
    {
      reference: `Practitioner/${currentPractitionerId}`, // Reference to Practitioner
      type: "Practitioner",                              // Optional, as "Practitioner" is implied
      display: 'performer name here'    // Optional display text (e.g., 'Dr. John Doe')
    }
  ]
};

  // SDOH categories with display name and definition for tooltips
  let sdohCategories = [
    { code: 'sdoh-category-unspecified', display: 'SDOH Category Unspecified', definition: 'Category for Social Determinant of Health artifacts that are not further specified with respect to category.' },
    { code: 'food-insecurity', display: 'Food Insecurity', definition: 'Uncertain, limited, or unstable access to food that is: adequate in quantity and in nutritional quality; culturally acceptable; safe and acquired in socially acceptable ways.' },
    { code: 'housing-instability', display: 'Housing Instability', definition: 'Currently consistently housed, but experiencing being behind on rent, multiple moves, or housing cost burden in the past 12 months.' },
    { code: 'homelessness', display: 'Homelessness', definition: 'Includes Sheltered Homelessness and Unsheltered Homelessness.' },
    { code: 'inadequate-housing', display: 'Inadequate Housing', definition: 'Housing does not meet habitability standards.' },
    { code: 'transportation-insecurity', display: 'Transportation Insecurity', definition: 'Uncertain, limited, or no access to safe, reliable, accessible, affordable, and socially acceptable transportation infrastructure.' },
    { code: 'financial-insecurity', display: 'Financial Insecurity', definition: 'Difficulty fully meeting current and ongoing financial obligations.' },
    { code: 'material-hardship', display: 'Material Hardship', definition: 'The lack of specific socially perceived basic physical necessities.' },
    { code: 'educational-attainment', display: 'Educational Attainment', definition: 'The level of education attained (high school diploma or equivalent).' },
    { code: 'employment-status', display: 'Employment Status', definition: 'The status of employment, whether looking for and available for work.' },
    { code: 'veteran-status', display: 'Veteran Status', definition: 'Whether one has served as active military with honorable release or discharge.' },
    { code: 'stress', display: 'Stress', definition: 'When a person perceives the demands of environmental stimuli to be greater than their ability to meet, mitigate, or alter those demands.' },
    { code: 'social-connection', display: 'Social Connection', definition: 'The structural, functional, and quality aspects of how individuals connect to each other.' },
    { code: 'intimate-partner-violence', display: 'Intimate Partner Violence', definition: 'Physical violence, sexual violence, or psychological harm by a current or former partner or spouse.' },
    { code: 'elder-abuse', display: 'Elder Abuse', definition: 'Intentional act or failure to act by a caregiver that causes harm to an older adult.' },
    { code: 'personal-health-literacy', display: 'Personal Health Literacy', definition: 'The ability to find, understand, and use information and services to inform health-related decisions.' },
    { code: 'health-insurance-coverage-status', display: 'Health Insurance Coverage Status', definition: 'Whether one has or does not have healthcare coverage or insurance.' },
    { code: 'medical-cost-burden', display: 'Medical Cost Burden', definition: 'A measure of financial pressure resulting from health spending.' },
    { code: 'digital-literacy', display: 'Digital Literacy', definition: 'The ability to access, manage, understand, integrate, communicate, and create information through digital devices and technologies.' },
    { code: 'digital-access', display: 'Digital Access', definition: 'Lacking adequate internet or a digital device to access the internet.' },
    { code: 'utility-insecurity', display: 'Utility Insecurity', definition: 'Inability to meet basic household energy needs (heating, cooling, etc.) and/or water needs due to service difficulties.' }
  ];

  // Fetch existing referrals
  async function fetchReferrals() {
    try {
      const response = await fetch(`/avail/api/servicerequest/${currentPatientId}`);
      referrals = await response.json();
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  }

  onMount(() => {
    fetchReferrals();
  });

  // Toggle form visibility
  function showNewReferralForm() {
    showForm = true;
  }

function orgChanged(event) {
  serviceRequestData.requester.reference = `Organization/${event.detail.organizationId}`;
}

  // Handle form submission
  async function handleSubmit() {
    try {
      const response = await fetch('/avail/api/servicerequest/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...serviceRequestData
        })
      });

      if (response.ok) {
        alert('ServiceRequest added successfully');
        showForm = false;  // Hide form after submission
        fetchReferrals();  // Refresh the list
      } else {
        alert('Failed to add ServiceRequest');
      }
    } catch (error) {
      console.error('Error adding ServiceRequest:', error);
    }
  }

  // Toggle category selection (checkboxes)
  function toggleCategory(code, display) {
    const existingCoding = serviceRequestData.code.coding.find(c => c.code === code);
    if (existingCoding) {
      serviceRequestData.code.coding = serviceRequestData.code.coding.filter(c => c.code !== code);
    } else {
      serviceRequestData.code.coding = [
        ...serviceRequestData.code.coding, 
        { code, system: 'http://terminology.hl7.org/CodeSystem/sdoh-categories', display }
      ];
    }
    serviceRequestData.code.text = serviceRequestData.code.coding.map(c => c.display).join(', ');
  }
</script>

<div class="referrals-section">
  <h2>Referrals</h2>

  {#if !showForm}
    <!-- Button and referrals list -->
    <button on:click={showNewReferralForm}>New Referral</button>
    {#if referrals.length > 0}
      <ul>
        {#each referrals as referral}
          <li>{referral.id}: {referral.description}</li>
        {/each}
      </ul>
    {:else}
      <p>No referrals found.</p>
    {/if}
  {/if}

  {#if showForm}
    <!-- New Referral Form -->
    <form on:submit|preventDefault={handleSubmit}>
      <h3>Draft Service Request Proposal</h3>

      <!-- Status and Intent -->
   <!--   <label>
        Status:
        <input type="text" bind:value={serviceRequestData.status} readonly />
      </label>
      <label>
        Intent:
        <input type="text" bind:value={serviceRequestData.intent} readonly />
      </label>
-->
      <PickOrg on:orgSelected={orgChanged} />
      <!-- Priority -->
      <label>
        Priority:
        <select bind:value={serviceRequestData.priority}>
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="asap">ASAP</option>
          <option value="stat">Stat</option>
        </select>
      </label>

      <!-- SDOH Categories (Checkboxes with Tooltips) -->
      <fieldset>
        <legend>SDOH Categories</legend>
        {#each sdohCategories as category}
          <div class="checkbox-group">
            <input type="checkbox" on:change={() => toggleCategory(category.code, category.display)} />
            <label title={category.definition}>{category.display}</label>
          </div>
        {/each}
      </fieldset>

      <!-- Submit Button -->
      <button type="submit">Submit</button>
    </form>
  {/if}
</div>

<style>
  .referrals-section {
  
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    padding: 10px 0;
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

  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  label {
    display: flex;
    flex-direction: column;
  }

  fieldset {
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 4px;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
  }

  input[type="checkbox"] {
    margin-right: 10px;
  }

  legend {
    font-weight: bold;
  }

  label[title] {
    cursor: help;
  }
</style>
