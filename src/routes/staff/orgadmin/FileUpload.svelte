<script>
  import axios from 'axios';
  import { exc_uploadStatus } from '$lib/stores';
  
  export let API_URL;
  
  let files = {
    staff: null,
    sam: null,
    oig: null,
    co: null
  };
  
  async function handleSubmit() {
    const formData = new FormData();
    for (const [key, file] of Object.entries(files)) {
      if (file) formData.append(key, file[0]);
    }
  
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      exc_uploadStatus.set('Files uploaded successfully');
    } catch (error) {
      exc_uploadStatus.set(`Error: ${error.message}`);
    }
  }
  </script>
  
  <form on:submit|preventDefault={handleSubmit}>
    <div>
      <label for="staff">Staff File (CSV):</label>
      <input type="file" id="staff" bind:files={files.staff} accept=".csv" required>
    </div>
    <div>
      <label for="sam">SAM File (CSV):</label>
      <input type="file" id="sam" bind:files={files.sam} accept=".csv" required>
    </div>
    <div>
      <label for="oig">OIG File (CSV):</label>
      <input type="file" id="oig" bind:files={files.oig} accept=".csv" required>
    </div>
    <div>
      <label for="co">Colorado File (XLSX):</label>
      <input type="file" id="co" bind:files={files.co} accept=".xlsx" required>
    </div>
    <button type="submit">Upload Files</button>
  </form>
  
  {#if $exc_uploadStatus}
    <p>{$exc_uploadStatus}</p>
  {/if}
  
  <style>
    form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  </style>
  