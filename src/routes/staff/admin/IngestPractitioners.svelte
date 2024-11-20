<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths'; // Import base path

    import Papa from 'papaparse';
  
    let fileInput;
    let isUploading = false;
    let uploadProgress = 0;
    let uploadedPractitioners = 0;
    let totalPractitioners = 0;
  
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
            totalPractitioners = results.data.length;
            for (let i = 0; i < results.data.length; i++) {
              const row = results.data[i];
              await addPractitioner(row);
              uploadedPractitioners++;
              uploadProgress = (uploadedPractitioners / totalPractitioners) * 100;
            }
            isUploading = false;
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            isUploading = false;
          }
        });
      }
    }
  
    async function addPractitioner(practitionerData) {
      const formattedData = {
        resourceType: 'Practitioner',
        name: [
          {
            given: [practitionerData['First Name [Required]']],
            family: practitionerData['Last Name [Required]']
          }
        ],
        telecom: [
          {
            system: 'email',
            value: practitionerData['Email Address [Required]']
          }
        ],
        birthDate: '1970-01-01' // Placeholder, as birthDate is required but not in the CSV
      };
  
      try {
        const response = await fetch(`${base}/api/practitioner/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData)
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const result = await response.json();
        console.log('Practitioner added:', result);
      } catch (error) {
        console.error('Error adding practitioner:', error);
      }
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
    .ingest-practitioners {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
  
    input[type="file"] {
      display: none;
    }
  
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
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
      background-color: #4CAF50;
      border-radius: 10px;
      transition: width 0.5s ease-in-out;
    }
  </style>