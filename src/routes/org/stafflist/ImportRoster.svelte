<script>
    import { onMount } from 'svelte';
    import ProviderList from './ProviderListGoogle.svelte';
  
    const FOLDER_ID = import.meta.env.VITE_GOOGLE_EXCLUSION_FOLDER_ID;
    const API_KEY = import.meta.env.VITE_GOOGLE_EXCLUSION_API_KEY;
  
    let files = [];
    let selectedFile = null;
    let loading = true;
    let error = null;
  
    onMount(() => {
      // Load only the Google API Client
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = initializeGapi;
      document.head.appendChild(gapiScript);
    });
  
    async function initializeGapi() {
      try {
        await new Promise((resolve, reject) => {
          gapi.load('client', { callback: resolve, onerror: reject });
        });
        
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            'https://sheets.googleapis.com/$discovery/rest?version=v4'
          ],
        });
  
        await loadFileList();
      } catch (err) {
        error = 'Error initializing GAPI: ' + err.message;
        console.error('GAPI initialization error:', err);
        loading = false;
      }
    }
  
    async function loadFileList() {
      try {
        const response = await gapi.client.drive.files.list({
          q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
          fields: 'files(id, name, modifiedTime)',
          orderBy: 'name',
          // Key settings for public access
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
  
        files = response.result.files;
      } catch (err) {
        error = 'Error loading files: ' + err.message;
      } finally {
        loading = false;
      }
    }
  </script>
  
  <div class="container mx-auto p-4">
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">{error}</span>
      </div>
    {/if}
  
    {#if loading}
      <div class="flex justify-center items-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    {:else if selectedFile}
      <div>
        <button 
          class="mb-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          on:click={() => selectedFile = null}
        >
          Back to Files
        </button>
        <ProviderList {selectedFile} on:error={(e) => error = e.detail} />
      </div>
    {:else}
      <div class="bg-white shadow-md rounded-lg">
        <h2 class="text-xl font-bold p-4 border-b">Exclusion List Rosters</h2>
        <div class="divide-y">
          {#each files as file}
            <button
              class="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center"
              on:click={() => selectedFile = file}
            >
              <span>{file.name}</span>
              <span class="text-sm text-gray-500">
                {new Date(file.modifiedTime).toLocaleDateString()}
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>