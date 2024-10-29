<script>
    import ViewReferral from './ViewReferral.svelte'; // Import the ViewReferral component
    export let serviceRequests = [];
  
    let selectedServiceRequest = null;
  
    // Function to select a service request
    function selectServiceRequest(serviceRequest) {
      selectedServiceRequest = serviceRequest;
    }
  </script>
  
  <div class="list-and-view-container">
    <!-- Left Side: List of Service Requests -->
    <div class="service-requests">
      <h3>Service Requests</h3>
      <ul>
        {#each serviceRequests as request}
          <li on:click={() => selectServiceRequest(request)}>
            {request.description}
          </li>
        {/each}
      </ul>
    </div>
  
    <!-- Right Side: Display selected Service Request details -->
    <div class="view-referral">
      {#if selectedServiceRequest}
        <ViewReferral referralTask={selectedServiceRequest} />
      {/if}
    </div>
  </div>
  
  <style>
    .list-and-view-container {
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
  
    .service-requests {
      flex: 1;
      background-color: #f9f9f9;
      padding: 20px;
      border-right: 1px solid #ccc;
    }
  
    ul {
      list-style-type: none;
      padding: 0;
    }
  
    li {
      cursor: pointer;
      padding: 5px;
      border-bottom: 1px solid #ccc;
    }
  
    li:hover {
      font-weight: bold;
    }
  
    .view-referral {
      flex: 2;
      padding: 20px;
      background-color: #f0f0f0;
    }
  </style>
  