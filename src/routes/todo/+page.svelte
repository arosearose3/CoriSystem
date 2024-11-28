<script>
    import { onMount } from 'svelte';
    
    let todos = [];
    let sortField = 'type';
    let sortDirection = 'asc';
  
    // Additional suggested columns
    const columns = [
      { id: 'type', label: 'Type' },
      { id: 'deadline', label: 'Deadline' },
      { id: 'description', label: 'Description' },
      { id: 'partOf', label: 'Part Of' },
      { id: 'priority', label: 'Priority' },
      { id: 'status', label: 'Status' },
      { id: 'requester', label: 'Requester' },
      { id: 'patient', label: 'Patient' }
    ];
  
    async function fetchTodos() {
      try {
        const [tasks, serviceRequests, appointments, carePlans, 
              communications, documents, questionnaireResponses, 
              diagnosticReports] = await Promise.all([
          fetchTasks(),
          fetchServiceRequests(),
          fetchAppointments(),
          fetchCarePlans(),
          fetchCommunicationRequests(),
          fetchDocumentReferences(),
          fetchQuestionnaireResponses(),
          fetchDiagnosticReports()
        ]);
  
        todos = [...tasks, ...serviceRequests, ...appointments, 
                 ...carePlans, ...communications, ...documents,
                 ...questionnaireResponses, ...diagnosticReports];
        sortData();
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    }
  
    // Stub handlers for FHIR resources
    async function fetchTasks() {
      // TODO: Implement FHIR query for Tasks needing attention
      return [];
    }
  
    async function fetchServiceRequests() {
      // TODO: Implement FHIR query for ServiceRequests needing attention
      return [];
    }
  
    // ... similar stubs for other resource types
  
    function handleSort(field) {
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'asc';
      }
      sortData();
    }
  
    function sortData() {
      todos = todos.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        return sortDirection === 'asc' 
          ? (aVal > bVal ? 1 : -1)
          : (aVal < bVal ? 1 : -1);
      });
    }
  
    onMount(() => {
      fetchTodos();
    });
  </script>
  
  <div class="container mx-auto p-4">
    <table class="min-w-full bg-white">
      <thead>
        <tr>
          {#each columns as column}
            <th 
              class="px-6 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
              on:click={() => handleSort(column.id)}
            >
              {column.label}
              {#if sortField === column.id}
                <span class="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each todos as todo}
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.type}
            </td>
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.deadline}
            </td>
            <td class="px-6 py-4 border-b border-gray-200">
              {todo.description}
            </td>
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.partOf}
            </td>
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.priority}
            </td>
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.status}
            </td>
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.requester}
            </td>
            <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
              {todo.patient}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>