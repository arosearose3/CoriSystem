<!-- ActivePlans.svelte -->
<script>
    import { onMount } from 'svelte';
    import { getUserPlanInstances } from '$lib/planTemplatesUtils.js';
  
    let planInstances = [];
    let loading = true;
    let error = null;
    let showActive = true; // Toggle state for active/dormant filter
  
    onMount(async () => {
      await loadPlanInstances();
    });
  
    async function loadPlanInstances() {
      try {
        loading = true;
        error = null;
        planInstances = await getUserPlanInstances();
      } catch (err) {
        error = err.message || 'Failed to load plan instances';
      } finally {
        loading = false;
      }
    }
  
    async function togglePlanStatus() {
      try {
        showActive = !showActive;
        // Here you would typically make an API call to get filtered plans
        // For now, we'll just reload all plans
        await loadPlanInstances();
      } catch (err) {
        error = 'Failed to update plan status filter';
      }
    }
  
    function getStatusColor(status) {
      switch (status?.toLowerCase()) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'dormant':
          return 'bg-gray-100 text-gray-800';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800';
        case 'completed':
          return 'bg-blue-100 text-blue-800';
        case 'error':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  
    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  </script>
  
  <div class="container">
    <div class="header">
      <h2>Current Plans</h2>
      <div class="status-toggle">
        <span class={showActive ? 'active-text' : ''}>Active</span>
        <button 
          class="toggle-button" 
          class:active={showActive} 
          on:click={togglePlanStatus}
          aria-label="Toggle plan status filter"
        >
          <div class="toggle-slider"></div>
        </button>
        <span class={!showActive ? 'active-text' : ''}>Dormant</span>
      </div>
    </div>
  
    {#if error}
      <div class="error-message">
        {error}
        <button on:click={loadPlanInstances}>Retry</button>
      </div>
    {/if}
  
    {#if loading}
      <div class="loading">Loading plans...</div>
    {:else if planInstances.length === 0}
      <div class="empty-state">
        <p>No {showActive ? 'active' : 'dormant'} plans found</p>
        <p class="hint">Create a new plan from the Plan Templates section</p>
      </div>
    {:else}
      <div class="plans-grid">
        {#each planInstances as plan (plan.id)}
          <div class="plan-card">
            <div class="plan-header">
              <h3>{plan.title || plan.name}</h3>
              <span class="status-badge {getStatusColor(plan.status)}">
                {plan.status}
              </span>
            </div>
  
            <div class="plan-content">
              {#if plan.description}
                <p class="description">{plan.description}</p>
              {/if}
  
              <div class="info-group">
                <label>Created</label>
                <span>{formatDate(plan.meta?.created)}</span>
              </div>
  
              <div class="info-group">
                <label>Last Updated</label>
                <span>{formatDate(plan.meta?.lastUpdated)}</span>
              </div>
  
              {#if plan.action?.length > 0}
                <div class="actions-section">
                  <h4>Actions</h4>
                  <ul>
                    {#each plan.action as action}
                      <li>
                        {#if action.trigger}
                          Event: {action.trigger[0].name}
                        {:else if action.definitionCanonical}
                          Activity: {action.definitionCanonical}
                        {/if}
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
  
            <div class="card-actions">
              <button class="view-button">View Details</button>
              <button class="cancel-button">
                {showActive ? 'Make Dormant' : 'Reactivate'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <style>
    .container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
  
    .status-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background-color: #f1f5f9;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
    }
  
    .toggle-button {
      position: relative;
      width: 3.5rem;
      height: 1.75rem;
      background-color: #cbd5e1;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }
  
    .toggle-button.active {
      background-color: #3b82f6;
    }
  
    .toggle-slider {
      position: absolute;
      top: 0.25rem;
      left: 0.25rem;
      width: 1.25rem;
      height: 1.25rem;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
  
    .toggle-button.active .toggle-slider {
      transform: translateX(1.75rem);
    }
  
    .active-text {
      font-weight: 600;
      color: #3b82f6;
    }
  
 
    h2 {
      color: #1a202c;
      margin: 0;
    }
  
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }
  
    .plan-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease;
    }
  
    .plan-card:hover {
      transform: translateY(-2px);
    }
  
   
  </style>