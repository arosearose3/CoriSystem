<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import { base } from '$app/paths'; // Import base path

  let fileInput;
  let isUploading = false;
  let uploadProgress = 0;
  let uploadedPractitioners = 0;
  let totalPractitioners = 0;
  const knownOrganizationId = 'YOUR_ORGANIZATION_ID'; // Replace with actual organization ID

  onMount(() => {
    fileInput = document.getElementById('fileInput');
  });

  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      isUploading = true;
      uploadProgress = 0;
      uploadedPractitioners = 0;
      totalPractitioners = 0;

      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const practitionersArray = results.data;
          totalPractitioners = practitionersArray.length;

          for (let i = 0; i < practitionersArray.length; i++) {
            const row = practitionersArray[i];
            await processPractitioner(row);
            uploadedPractitioners++;
            uploadProgress = (uploadedPractitioners / totalPractitioners) * 100;
          }

          isUploading = false;
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          isUploading = false;
        },
      });
    }
  }

  async function processPractitioner(rowData) {
    const email = rowData['Admin Email for Results'] || rowData['Staff Email for Cori'];
    if (!email) {
      console.error('No email provided for row:', rowData);
      return;
    }

    try {
      // Check if practitioner with email exists
      const existingPractitioner = await fetch(`${base}/api/practitioner/email/${encodeURIComponent(email)}`);
      let practitioner;

      if (existingPractitioner.ok) {
        practitioner = await existingPractitioner.json();
        // Check if practitioner is associated with the organization
        const isAssociated = practitioner.organizationIds.includes(knownOrganizationId);

        if (!isAssociated) {
          // Associate practitioner with organization
          await associatePractitionerWithOrg(practitioner.id);
        } else {
          // Update practitioner record
          await updatePractitioner(practitioner.id, rowData);
        }
      } else if (existingPractitioner.status === 404) {
        // Practitioner does not exist, create new
        practitioner = await createPractitioner(rowData);
        // Associate new practitioner with organization
        await associatePractitionerWithOrg(practitioner.id);
      } else {
        throw new Error(`Error checking practitioner existence: ${existingPractitioner.statusText}`);
      }
    } catch (error) {
      console.error('Error processing practitioner:', error);
    }
  }

  async function createPractitioner(practitionerData) {
    const formattedData = {
      resourceType: 'Practitioner',
      name: [
        {
          given: [practitionerData['First']],
          family: practitionerData['Last'],
        },
      ],
      telecom: [
        {
          system: 'email',
          value: practitionerData['Admin Email for Results'] || practitionerData['Staff Email for Cori'],
        },
      ],
      birthDate: practitionerData['DOB'] || '1970-01-01',
      identifier: [
        {
          system: 'http://hl7.org/fhir/sid/us-npi',
          value: practitionerData['NPI'],
        },
      ],
    };

    const response = await fetch(`${base}/api/practitioner/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create practitioner: ${response.statusText}`);
    }

    return response.json();
  }

  async function updatePractitioner(practitionerId, practitionerData) {
    const updatedData = {
      name: [
        {
          given: [practitionerData['First']],
          family: practitionerData['Last'],
        },
      ],
      birthDate: practitionerData['DOB'] || '1970-01-01',
      identifier: [
        {
          system: 'http://hl7.org/fhir/sid/us-npi',
          value: practitionerData['NPI'],
        },
      ],
    };

    const response = await fetch(`${base}/api/practitioner/${practitionerId}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update practitioner: ${response.statusText}`);
    }

    return response.json();
  }

  async function associatePractitionerWithOrg(practitionerId) {
    const associationData = {
      practitionerId,
      organizationId: knownOrganizationId,
    };

    const response = await fetch(`${base}/api/practitioner/associate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(associationData),
    });

    if (!response.ok) {
      throw new Error(`Failed to associate practitioner with organization: ${response.statusText}`);
    }

    return response.json();
  }
</script>

<div class="ingest-practitioners">
  <h2>Ingest Practitioners</h2>
  <input type="file" id="fileInput" accept=".csv" on:change={handleFileSelect} disabled={isUploading} />
  <label for="fileInput" class="button">
    {isUploading ? 'Uploading...' : 'Browse'}
  </label>

  {#if isUploading}
    <div class="progress-bar">
      <div class="progress" style="width: {uploadProgress}%"></div>
    </div>
    <p>Uploaded {uploadedPractitioners} of {totalPractitioners} practitioners</p>
  {/if}
</div>

<style>
  /* Styles remain the same as before */
  .ingest-practitioners {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  input[type='file'] {
    display: none;
  }

  .button {
    display: inline-block;
    padding: 10px 20px;
    background-color: #4caf50;
    color: white;
    cursor: pointer;
    border-radius: 5px;
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background-color: #f0f0f0;
    border-radius: 10px;
    margin-top: 20px;
  }

  .progress {
    height: 100%;
    background-color: #4caf50;
    border-radius: 10px;
    transition: width 0.5s ease-in-out;
  }
</style>
