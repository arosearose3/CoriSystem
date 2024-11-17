<script>

import { onMount } from 'svelte';

    // Define the possible roles and statuses
    const roles = ['Requester', 'Performer', 'Admin'];
    const statuses = [
      'draft',
      'active',
      'on-hold',
      'revoked',
      'completed',
      'entered-in-error',
      'unknown'
    ];
  
    // Initialize selected role and status
    let selectedRole = 'Requester';
    let currentStatus = 'draft';
  
    // Define the status transitions based on role and current status
    const transitions = {
      'draft': {
        'Requester': ['active', 'entered-in-error', 'revoked'],
        'Admin': ['entered-in-error']
      },
      'active': {
        'Requester': ['on-hold', 'revoked', 'entered-in-error'],
        'Performer': ['on-hold', 'completed'],
        'Admin': ['entered-in-error']
      },
      'on-hold': {
        'Requester': ['active', 'revoked', 'entered-in-error'],
        'Performer': ['active', 'completed'],
        'Admin': ['entered-in-error']
      },
      'revoked': {
        'Admin': ['entered-in-error']
      },
      'completed': {
        'Admin': ['entered-in-error']
      },
      'entered-in-error': {
        // Terminal state; no further changes allowed
      },
      'unknown': {
        'Requester': ['active', 'revoked', 'entered-in-error'],
        'Admin': ['active', 'entered-in-error']
      }
    };
  
    // Function to get allowed status transitions for each role
    function getAllowedStatusTransitions(role, currentStatus) {
      const possibleTransitions = transitions[currentStatus] || {};
      const allowedStatuses = possibleTransitions[role] || [];
      return allowedStatuses;
    }
  
    // Function to get allowed statuses for all roles
    function getAllowedStatusesForAllRoles(currentStatus) {
      const rolesAllowedStatuses = {};
      for (let role of roles) {
        rolesAllowedStatuses[role] = getAllowedStatusTransitions(role, currentStatus);
      }
      return rolesAllowedStatuses;
    }
  
    // Reactive statement to update allowed statuses when selections change
    $: rolesAllowedStatuses = getAllowedStatusesForAllRoles(currentStatus);



    const serviceRequest = {
  id: "sr-123",
  resourceType: "ServiceRequest",
  status: "active",
  subject: {
    reference: "Patient/pat-123",
    display: "Jane Smith"
  },
  category: [{
    coding: [{
      display: "Food Assistance"
    }]
  }],
  authoredOn: "2024-11-15T10:00:00Z",
  requester: {
    reference: "Practitioner/prac-456",
    display: "Dr. Linda Johnson"
  }
};

const associatedTasks = [
  {
    id: "task-1",
    status: "completed",
    businessStatus: { coding: [{ code: "intake" }] },
    description: "Initial intake assessment",
    lastModified: "2024-11-15T11:00:00Z",
    owner: { display: "Intake Coordinator" }
  },
  {
    id: "task-2",
    status: "completed",
    businessStatus: { coding: [{ code: "eligibility" }] },
    description: "Eligibility verification",
    lastModified: "2024-11-15T14:00:00Z",
    owner: { display: "Eligibility Specialist" }
  },
  {
    id: "task-3",
    status: "in-progress",
    businessStatus: { coding: [{ code: "service-delivery" }] },
    description: "Weekly food delivery arrangement",
    lastModified: "2024-11-16T09:00:00Z",
    owner: { display: "Service Coordinator" }
  },
  {
    id: "task-4",
    status: "on-hold",
    businessStatus: { coding: [{ code: "transportation" }] },
    description: "Transportation coordination",
    lastModified: "2024-11-16T10:00:00Z",
    owner: { display: "Transport Coordinator" }
  },
  {
    id: "task-5",
    status: "requested",
    businessStatus: { coding: [{ code: "follow-up" }] },
    description: "30-day follow-up assessment",
    lastModified: "2024-11-16T11:00:00Z",
    owner: { display: "Case Manager" }
  }
];

// Status color mapping
const statusColors = {
  completed: "bg-green-500",
  "in-progress": "bg-blue-500",
  "on-hold": "bg-yellow-500",
  requested: "bg-purple-500",
  rejected: "bg-red-500",
  cancelled: "bg-gray-500"
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}



  </script>
  
  <!-- Dropdowns for selecting role and current status -->
  <div>
    <label for="role-select">Select Role:</label>
    <select id="role-select" bind:value={selectedRole}>
      {#each roles as role}
        <option value="{role}">{role}</option>
      {/each}
    </select>
  
    <label for="status-select">Select Current Status:</label>
    <select id="status-select" bind:value={currentStatus}>
      {#each statuses as status}
        <option value="{status}">{status}</option>
      {/each}
    </select>
  </div>
  
  <!-- Display the statuses each role can change to -->
  <div style="display: flex; margin-top: 20px;">
    {#each roles as role}
      <div style="flex: 1; padding: 0 10px;">
        <h3>{role}</h3>
        <ul>
          {#each statuses as statusOption}
            <li style="color: {rolesAllowedStatuses[role].includes(statusOption) ? 'black' : 'gray'};">
              {statusOption}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
  <div class="max-w-4xl mx-auto p-4">
    <!-- Service Request Header -->
    <div class="bg-white shadow-lg rounded-lg p-4 mb-6">
      <h2 class="text-2xl font-bold mb-2">Service Request: {serviceRequest.category[0].coding[0].display}</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><span class="font-semibold">Patient:</span> {serviceRequest.subject.display}</p>
          <p><span class="font-semibold">Requester:</span> {serviceRequest.requester.display}</p>
        </div>
        <div>
          <p><span class="font-semibold">Status:</span> {serviceRequest.status}</p>
          <p><span class="font-semibold">Created:</span> {formatDate(serviceRequest.authoredOn)}</p>
        </div>
      </div>
    </div>
  
    <!-- Tasks Timeline -->
    <div class="relative">
      {#each associatedTasks as task, i}
        <div class="flex mb-8">
          <!-- Timeline connector -->
          {#if i < associatedTasks.length - 1}
            <div class="absolute h-full w-0.5 bg-gray-200" 
                 style="left: 1.25rem; top: {i * 2 + 2}rem;">
            </div>
          {/if}
  
          <!-- Status dot -->
          <div class="relative">
            <div class={`w-8 h-8 rounded-full ${statusColors[task.status]} z-10 flex items-center justify-center text-white`}>
              {i + 1}
            </div>
          </div>
  
          <!-- Task details -->
          <div class="ml-4 flex-grow">
            <div class="bg-white shadow rounded-lg p-4">
              <div class="flex justify-between items-start">
                <h3 class="font-semibold">{task.description}</h3>
                <span class={`px-2 py-1 rounded-full text-xs text-white ${statusColors[task.status]}`}>
                  {task.status}
                </span>
              </div>
              <div class="mt-2 text-sm text-gray-600">
                <p><span class="font-semibold">Owner:</span> {task.owner.display}</p>
                <p><span class="font-semibold">Last Updated:</span> {formatDate(task.lastModified)}</p>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  
    <!-- Task Summary -->
    <div class="mt-6 bg-white shadow-lg rounded-lg p-4">
      <h3 class="font-bold mb-2">Task Summary</h3>
      <div class="flex space-x-4">
        {#each Object.entries(statusColors) as [status, color]}
          {@const count = associatedTasks.filter(t => t.status === status).length}
          {#if count > 0}
            <div class="flex items-center">
              <div class={`w-3 h-3 rounded-full ${color} mr-1`}></div>
              <span class="text-sm">{status}: {count}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
  
  