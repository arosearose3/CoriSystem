<script>
    export let referralTask = {
      status: 'requested',
      intent: 'order',
      priority: 'routine',
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/CodeSystem/task-code',
            code: 'fulfill',
            display: 'Service Request Fulfillment'
          }
        ]
      },
      focus: { reference: 'ServiceRequest/123' },
      for: { reference: 'Patient/456' },
      requester: { reference: 'Practitioner/789' },
      owner: { reference: 'Organization/321' },
      authoredOn: '2024-09-13T10:00:00Z',
      output: [
        {
          type: {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/sdoh-clinicalcare/CodeSystem/SDOHCC-CodeSystemTemporaryCodes',
                code: 'resulting-activity',
                display: 'Performed Activity'
              }
            ]
          },
          valueReference: { reference: 'Procedure/789' }
        }
      ]
    };
  
    function formatDateTime(dateTime) {
      return new Date(dateTime).toLocaleString();
    }
  </script>
  
  <div>
    <h2>View Referral Task</h2>
  
    <p><strong>Status:</strong> {referralTask.status}</p>
    <p><strong>Intent:</strong> {referralTask.intent}</p>
    <p><strong>Priority:</strong> {referralTask.priority}</p>
    
    <!-- Check if focus and reference exist -->
    <p><strong>Service Request:</strong> {referralTask?.focus?.reference || 'N/A'}</p>
    
    <!-- Check if 'for' and reference exist -->
    <p><strong>For Patient:</strong> {referralTask?.for?.reference || 'N/A'}</p>
    
    <!-- Check if requester and reference exist -->
    <p><strong>Requester:</strong> {referralTask?.requester?.reference || 'N/A'}</p>
    
    <!-- Check if owner and reference exist -->
    <p><strong>Owner:</strong> {referralTask?.owner?.reference || 'N/A'}</p>
    
    <p><strong>Authored On:</strong> {formatDateTime(referralTask.authoredOn)}</p>
  
    <h3>Performed Activities:</h3>
    <ul>
      {#if referralTask.output && referralTask.output.length > 0}
        {#each referralTask.output as output}
          <li>
            <strong>{output?.type?.coding[0]?.display || 'N/A'}:</strong> {output?.valueReference?.reference || 'N/A'}
          </li>
        {/each}
      {:else}
        <li>No performed activities available.</li>
      {/if}
    </ul>
  </div>
  
  <style>
    p, li {
      margin-bottom: 10px;
    }
    h3 {
      margin-top: 20px;
    }
  </style>
  