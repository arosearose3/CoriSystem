<script>
  import { onMount } from 'svelte';
  import  HTMLEditor  from './HTMLEditor.svelte';
  import { base } from '$app/paths';
  

  let actionType = 'System';
  let selectedResource = '';
  let selectedOperation = 'Create';
  let messageType = 'Notification';
  let apiEndpoint = '';
  let toField = '';
  let subjectField = '';
  let textField = '';
  let htmlContent = '';

  let activityName = ''; // For the name of the ActivityDefinition
  let saveStatus = ''; // For showing save status/feedback

  // System variables that can be included
  let systemVars = [
    { id: 'userName', label: 'Current User Name', checked: false },
    { id: 'userEmail', label: 'Current User Email', checked: false },
    { id: 'practitionerRoleId', label: 'Current PractitionerRole ID', checked: false },
    { id: 'practitionerId', label: 'Current Practitioner ID', checked: false },
    { id: 'organizationId', label: 'Organization ID', checked: false },
    { id: 'orgName', label: 'Organization Name', checked: false }
  ];

  // FHIR Resources list
  const fhirResources = [
    'Patient',
    'Practitioner',
    'PractitionerRole',
    'Organization',
    'Appointment',
    'Task',
    'Questionnaire',
    'QuestionnaireResponse',
    'Communication',
    'Schedule'
  ];

  // Generate ActivityDefinition based on current selections
   // Make activityDefinition reactive to all possible input changes
   $: activityDefinition = generateActivityDefinition(
    actionType,
    selectedResource,
    selectedOperation,
    messageType,
    apiEndpoint,
    toField,
    subjectField,
    textField,
    htmlContent,
    systemVars
  );


  async function saveActivityDefinition() {
  try {
    const definition = JSON.parse(activityDefinition); // Get current definition
    
    // Add name-related fields
    definition.name = activityName.replace(/\s+/g, '-').toLowerCase(); // computer-friendly name
    definition.title = activityName; // human-friendly name
    definition.status = 'active';
    definition.experimental = false;
    definition.date = new Date().toISOString();
    
    // Make the API call to save
    const response = await fetch(`${base}/api/activityDefinitions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(definition)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    saveStatus = 'ActivityDefinition saved successfully!';
    
    // Clear status after 3 seconds
    setTimeout(() => {
      saveStatus = '';
    }, 3000);

  } catch (error) {
    console.error('Error saving ActivityDefinition:', error);
    saveStatus = `Error saving: ${error.message}`;
  }
}

  function generateActivityDefinition(
    actionType,
    selectedResource,
    selectedOperation,
    messageType,
    apiEndpoint,
    toField,
    subjectField,
    textField,
    htmlContent,
    systemVars
  ) {
    console.log ("in generateActivityDefinition");

    let definition = {
      resourceType: 'ActivityDefinition',
      status: 'active'
    };

      // Add name if it exists
  if (activityName) {
    definition.name = activityName.replace(/\s+/g, '-').toLowerCase();
    definition.title = activityName;
  }

    switch(actionType) {
      case 'System':
        definition = {
          ...definition,
          kind: 'Task',
          code: {
            coding: [{
              system: 'https://combinebh.org/fhir/ECA/system-actions',
              code: 'api-call'
            }]
          },
          extension: [{
            url: 'https://combinebh.org/fhir/ECA/endpoint',
            valueUrl: apiEndpoint
          }]
        };
        if (systemVars.some(v => v.checked)) {
          definition.extension.push({
            url: 'https://combinebh.org/fhir/ECA/system-vars',
            extension: systemVars
              .filter(v => v.checked)
              .map(v => ({
                url: v.id,
                valueBoolean: true
              }))
          });
        }
        break;

      case 'FHIR Resource':
        definition = {
          ...definition,
          kind: selectedResource,
          code: {
            coding: [{
              system: 'http://example.org/fhir-operations',
              code: selectedOperation.toLowerCase()
            }]
          }
        };
        if (systemVars.some(v => v.checked)) {
          definition.dynamicValue = systemVars
            .filter(v => v.checked)
            .map(v => ({
              path: v.id,
              expression: {
                language: 'text/fhirpath',
                expression: `%${v.id}`
              }
            }));
        }
        break;

      case 'Message':
        definition = {
          ...definition,
          kind: 'CommunicationRequest',
          code: {
            coding: [{
              system: 'http://example.org/message-types',
              code: messageType.toLowerCase()
            }]
          },
          dynamicValue: [
            {
              path: 'recipient',
              expression: {
                language: 'text/fhirpath',
                expression: `'${toField}'`
              }
            },
            {
              path: 'payload.content',
              expression: {
                language: 'text/fhirpath',
                expression: messageType === 'Email' ? 
                  `'${subjectField}|${htmlContent}'` :
                  `'${textField}'`
              }
            }
          ]
        };
        break;
    }

    return JSON.stringify(definition, null, 2);
  }
</script>

<div class="container p-4">
  <div class="mb-4">
    <label class="block text-sm font-medium mb-2">Activity Name</label>
    <input 
      type="text"
      bind:value={activityName}
      placeholder="Enter a name for this activity"
      class="w-full p-2 border rounded-md"
      required
    />
  </div>

  <div class="mb-4">
    <label class="block text-sm font-medium mb-2">Action Type</label>
    <select 
      bind:value={actionType}
      class="w-full p-2 border rounded-md"
    >
      <option>System</option>
      <option>FHIR Resource</option>
      <option>Message</option>
    </select>
  </div>

  {#if actionType === 'System'}
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">API Endpoint</label>
      <input 
        type="text"
        bind:value={apiEndpoint}
        placeholder="e.g., exclusion/compareOrgRoster"
        class="w-full p-2 border rounded-md"
      />
    </div>
  {/if}

  {#if actionType === 'FHIR Resource'}
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">Operation</label>
      <select 
        bind:value={selectedOperation}
        class="w-full p-2 border rounded-md mb-2"
      >
        <option>Create</option>
        <option>Update</option>
        <option>Delete</option>
      </select>

      <label class="block text-sm font-medium mb-2">Resource</label>
      <select 
        bind:value={selectedResource}
        class="w-full p-2 border rounded-md"
      >
        {#each fhirResources as resource}
          <option>{resource}</option>
        {/each}
      </select>
    </div>
  {/if}

  {#if actionType === 'Message'}
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">Message Type</label>
      <select 
        bind:value={messageType}
        class="w-full p-2 border rounded-md mb-4"
      >
        <option>Notification</option>
        <option>Email</option>
      </select>

      <label class="block text-sm font-medium mb-2">To:</label>
      <input 
        type="text"
        bind:value={toField}
        class="w-full p-2 border rounded-md mb-2"
      />

      {#if messageType === 'Email'}
        <label class="block text-sm font-medium mb-2">Subject:</label>
        <input 
          type="text"
          bind:value={subjectField}
          class="w-full p-2 border rounded-md mb-2"
        />
        
        <label class="block text-sm font-medium mb-2">Content:</label>
        <HTMLEditor
          bind:value={htmlContent}
          init={{
            height: 300,
            menubar: false,
            plugins: ['link', 'lists', 'table'],
            toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist'
          }}
        />
      {:else}
        <label class="block text-sm font-medium mb-2">Text:</label>
        <textarea 
          bind:value={textField}
          class="w-full p-2 border rounded-md"
          rows="3"
        ></textarea>
      {/if}
    </div>
  {/if}

  {#if actionType !== 'Message'}
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">System Variables</label>
      {#each systemVars as variable}
        <div class="flex items-center mb-2">
          <input
            type="checkbox"
            bind:checked={variable.checked}
            class="mr-2"
          />
          <label>{variable.label}</label>
        </div>
      {/each}
    </div>
  {/if}

    <!-- Add this before the preview section -->
    <div class="mt-4 flex justify-end">
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        on:click={saveActivityDefinition}
        disabled={!activityName}
      >
        Save Activity Definition
      </button>
    </div>
  
    <!-- Add status message display -->
    {#if saveStatus}
      <div class="mt-2 p-2 rounded-md text-center {saveStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
        {saveStatus}
      </div>
    {/if}

  <div class="mt-6">
    <label class="block text-sm font-medium mb-2">Generated ActivityDefinition:</label>
    <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto">
      {activityDefinition}
    </pre>
  </div>
</div>

<style>
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>