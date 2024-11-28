<!-- TaskList.svelte -->
<script>
    import { onMount } from 'svelte';
   
    let tasks = [];
    let sortField = 'status';
    let sortAsc = true;
    let alertOpen = false;
    let statusChange = null;
   
    const allowableTransitions = {
      pending: ["ready", "cancelled"],
      ready: ["in-progress", "cancelled"],
      "in-progress": ["complete", "failed", "suspended"],
      suspended: ["in-progress", "cancelled"], 
      failed: ["ready"],
      complete: [],
      cancelled: []
    };
   
    function generateProvenance(taskId, oldStatus, newStatus, userId) {
      return {
        resourceType: "Provenance",
        recorded: new Date().toISOString(),
        agent: [{ who: { reference: `User/${userId}` }}],
        target: [{ reference: `Task/${taskId}` }],
        entity: [{
          role: "source",
          what: { reference: `Task/${taskId}` },
          description: `Status changed from ${oldStatus} to ${newStatus}`
        }]
      };
    }
   
    async function fetchTasks() {
      try {
        const response = await fetch('/api/task/getUsersTasks');
        tasks = await response.json();
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    }
   
    function handleSort(field) {
      if (field === sortField) {
        sortAsc = !sortAsc;
      } else {
        sortField = field;
        sortAsc = true;
      }
    }
   
    function sortTasks(a, b) {
      const modifier = sortAsc ? 1 : -1;
      switch (sortField) {
        case 'status':
          return modifier * a.status.localeCompare(b.status);
        case 'involvement':
          return modifier * a.userRole.localeCompare(b.userRole);
        case 'deadline':
          return modifier * (new Date(a.deadline) - new Date(b.deadline));
        default:
          return 0;
      }
    }
   
    function handleStatusChange(taskId, newStatus) {
      const task = tasks.find(t => t.id === taskId);
      statusChange = {
        taskId,
        oldStatus: task.status,
        newStatus
      };
      alertOpen = true;
    }
   
    async function confirmStatusChange() {
      try {
        const provenance = generateProvenance(
          statusChange.taskId,
          statusChange.oldStatus,
          statusChange.newStatus,
          'current-user-id'
        );
   
        await fetch(`/api/task/${statusChange.taskId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: statusChange.newStatus,
            provenance
          })
        });
   
        await fetchTasks();
      } catch (error) {
        console.error('Error updating status:', error);
      } finally {
        alertOpen = false;
        statusChange = null;
      }
    }
   
    onMount(fetchTasks);
   </script>
   
   <div class="p-4">
    <table>
      <thead>
        <tr>
          <th on:click={() => handleSort('status')} class="cursor-pointer">
            Status {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}
          </th>
          <th on:click={() => handleSort('involvement')} class="cursor-pointer">
            User Role {sortField === 'involvement' ? (sortAsc ? '↑' : '↓') : ''}
          </th>
          <th on:click={() => handleSort('deadline')} class="cursor-pointer">
            Deadline {sortField === 'deadline' ? (sortAsc ? '↑' : '↓') : ''}
          </th>
          <th>Change Status</th>
        </tr>
      </thead>
      <tbody>
        {#each [...tasks].sort(sortTasks) as task}
          <tr>
            <td>{task.status}</td>
            <td>{task.userRole}</td>
            <td>{new Date(task.deadline).toLocaleDateString()}</td>
            <td>
              <select 
                on:change={(e) => handleStatusChange(task.id, e.target.value)}
                disabled={!allowableTransitions[task.status]?.length}>
                <option value="">Change status</option>
                {#each allowableTransitions[task.status] || [] as status}
                  <option value={status}>{status}</option>
                {/each}
              </select>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
   
    {#if alertOpen}
      <div class="modal">
        <div class="modal-content">
          <h2>Confirm Status Change</h2>
          <p>
            Change task status from {statusChange?.oldStatus} to {statusChange?.newStatus}?
          </p>
          <button on:click={confirmStatusChange}>Confirm</button>
          <button on:click={() => alertOpen = false}>Cancel</button>
        </div>
      </div>
    {/if}
   </div>
   
   <style>
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
    }
   
    .modal-content {
      background: white;
      padding: 20px;
      border-radius: 4px;
    }
   
    table {
      width: 100%;
      border-collapse: collapse;
    }
   
    th, td {
      padding: 8px;
      border: 1px solid #ddd;
    }
   
    th {
      background: #f5f5f5;
    }
   
    .cursor-pointer {
      cursor: pointer;
    }
   </style>