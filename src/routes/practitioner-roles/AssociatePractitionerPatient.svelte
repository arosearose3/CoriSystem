<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; // Import base path

    let practitioners = [];
    let patients = [];
    let associations = [];
    let message = '';

    // Fetch practitioners and patients when the component is mounted
    onMount(async () => {
      await fetchPractitioners();
      await fetchPatients();
    });

    // Function to fetch practitioners and transform the FHIR response
    async function fetchPractitioners() {
      try {
        const response = await fetch(`${base}/api/practitioner/all`);
        const data = await response.json();

        // Check if the response is a FHIR bundle and has entries
        if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
          practitioners = data.entry.map(entry => {
            const practitioner = entry.resource;
            return {
              id: practitioner.id || '',
              displayName: `${practitioner.name[0]?.given?.join(' ') || ''} ${practitioner.name[0]?.family || ''}`,
            };
          });
        } else {
          throw new Error('Invalid Practitioner FHIR Bundle format');
        }
      } catch (error) {
        console.error('Error fetching practitioners:', error);
        message = 'Error fetching practitioners. Please try again.';
      }
    }

    // Function to fetch patients and transform the FHIR response
    async function fetchPatients() {
      try {
        const response = await fetch(`${base}/api/patient/all`);
        const data = await response.json();

        // Check if the response is a FHIR bundle and has entries
        if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
          patients = data.entry.map(entry => {
            const patient = entry.resource;
            return {
              id: patient.id || '',
              displayName: `${patient.name[0]?.given?.join(' ') || ''} ${patient.name[0]?.family || ''}`,
            };
          });
        } else {
          throw new Error('Invalid Patient FHIR Bundle format');
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
        message = 'Error fetching patients. Please try again.';
      }
    }

    // Function to add a new practitioner-patient association
    function addAssociation() {
      associations = [...associations, { practitionerId: '', patientId: '' }];
    }

    // Function to remove an association from the list
    function removeAssociation(index) {
      associations = associations.filter((_, i) => i !== index);
    }

    // Function to handle the form submission and update patient with practitioner
    async function handleSubmit() {
      try {
        const updates = associations.map(assoc => ({
          id: assoc.patientId,
          resourceType: 'Patient',
          generalPractitioner: [
            {
              reference: `Practitioner/${assoc.practitionerId}`,
            },
          ],
        }));
        let sendUpdate = updates[0];
        const response = await fetch(`${base}/api/patient/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendUpdate),
        });

        const result = await response.json();

        if (response.ok) {
          message = 'Patient-Practitioner associations updated successfully';
          associations = [];
        } else {
          message = `Error: ${result.error || 'Unknown error occurred'}`;
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        message = `Error: ${error.message || 'Unknown error occurred'}`;
      }
    }

    // Function to cancel the form and reset the associations
    function handleCancel() {
      associations = [];
      message = '';
    }
</script>

<div class="container">
  <h2>Associate Practitioners with Patients</h2>

  <button on:click={addAssociation}>Add Association</button>

  {#each associations as association, index}
    <div class="association">
      <!-- Practitioner dropdown -->
      <select bind:value={association.practitionerId}>
        <option value="">Select Practitioner</option>
        {#each practitioners as practitioner}
          <option value={practitioner.id}>{practitioner.displayName}</option>
        {/each}
      </select>

      <!-- Patient dropdown -->
      <select bind:value={association.patientId}>
        <option value="">Select Patient</option>
        {#each patients as patient}
          <option value={patient.id}>{patient.displayName}</option>
        {/each}
      </select>

      <button on:click={() => removeAssociation(index)}>Remove</button>
    </div>
  {/each}

  <div class="actions">
    <button on:click={handleSubmit}>Submit</button>
    <button on:click={handleCancel}>Cancel</button>
  </div>

  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .association {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }
  select {
    flex-grow: 1;
  }
  .actions {
    margin-top: 20px;
  }
  button {
    margin-right: 10px;
  }
  .message {
    margin-top: 15px;
    padding: 10px;
    background-color: #f0f0f0;
    border-radius: 4px;
  }
</style>
