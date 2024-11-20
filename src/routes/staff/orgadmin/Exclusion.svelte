<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

  import FileUpload from './FileUpload.svelte';
  import ExclusionCheck from './ExclusionCheck.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import EmailNotification from './EmailNotification.svelte';
  
  const API_URL = '${base}/api/exclusion/';
  
  onMount(() => {
    console.log('Main component mounted');
  });
  </script>
  
  <main>
    <h1>Exclusion Checker</h1>
    <FileUpload {API_URL} />
    <ExclusionCheck {API_URL} />
    <ResultsTable />
    <EmailNotification {API_URL} />
  </main>
  
  <style>
    main {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>