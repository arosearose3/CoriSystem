<script>
  import { base } from '$app/paths';

  let OIGFile = null;
  let SAMHSAFile = null;
  let COFile = null;
  let uploadStatus = '';
  let uploadProgress = 0;

  // Function to handle file selection
  function handleFileChange(event, fileType) {
    const file = event.target.files[0];
    if (fileType === 'OIG') {
      OIGFile = file;
    } else if (fileType === 'SAMHSA') {
      SAMHSAFile = file;
    } else if (fileType === 'CO') {
      COFile = file;
    }
  }

  // Function to upload file to the server and show progress bar
  function uploadFile(file, fileType) {
    if (!file) {
      uploadStatus = `Please select a file for ${fileType}.`;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    // Event listener for upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        uploadProgress = Math.round((event.loaded / event.total) * 100);
      }
    };

    // Event listener for request completion
    xhr.onload = function () {
      if (xhr.status === 200) {
        uploadStatus = `${fileType} file uploaded successfully!`;
      } else {
        uploadStatus = `Failed to upload ${fileType} file.`;
      }
      uploadProgress = 0; // Reset progress bar after upload completes
    };

    // Event listener for request error
    xhr.onerror = function () {
      uploadStatus = `An error occurred while uploading ${fileType} file.`;
      uploadProgress = 0;
    };

    xhr.open('POST', `${base}/api/fileupload/upload/${fileType}`);
    xhr.send(formData);
  }
</script>

<div class="upload-container">
  <h4>Upload Exclusion Files</h4>

  <div>
    <label>Load OIG:</label>
    <input type="file" on:change={(e) => handleFileChange(e, 'OIG')} />
    <button on:click={() => uploadFile(OIGFile, 'OIG')}>Upload OIG</button>
  </div>

  <div>
    <label>Load SAMHSA:</label>
    <input type="file" on:change={(e) => handleFileChange(e, 'SAMHSA')} />
    <button on:click={() => uploadFile(SAMHSAFile, 'SAMHSA')}>Upload SAMHSA</button>
  </div>

  <div>
    <label>Load Colorado:</label>
    <input type="file" on:change={(e) => handleFileChange(e, 'CO')} />
    <button on:click={() => uploadFile(COFile, 'CO')}>Upload Colorado</button>
  </div>

  <!-- Progress bar for file upload -->
  {#if uploadProgress > 0}
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {uploadProgress}%;">{uploadProgress}%</div>
    </div>
  {/if}

  <p>{uploadStatus}</p>
</div>

<style>
  .upload-container {
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    max-width: 600px;
    margin: 0 auto;
  }

  div {
    margin-bottom: 10px;
  }

  label {
    margin-right: 10px;
  }

  button {
    padding: 5px 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  button:hover {
    background-color: #0056b3;
  }

  p {
    margin-top: 10px;
    color: green;
  }

  .progress-bar-container {
    width: 100%;
    background-color: #f3f3f3;
    border-radius: 4px;
    margin-top: 10px;
  }

  .progress-bar {
    height: 20px;
    background-color: #4caf50;
    border-radius: 4px;
    text-align: center;
    color: white;
    line-height: 20px;
  }
</style>
