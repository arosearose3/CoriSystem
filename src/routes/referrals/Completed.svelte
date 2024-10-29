<!-- src/routes/referrals/Completed.svelte -->
<script>
    let completedReferrals = [
      {
        id: 'SR003',
        subject: 'Patient/234',
        status: 'completed',
        code: 'X-Ray',
        priority: 'routine',
        requester: 'Practitioner/111',
        performer: 'Radiology/222',
        occurrenceDateTime: '2024-09-25T09:00:00',
        reasonCode: 'Chest Pain'
      },
      {
        id: 'SR004',
        subject: 'Patient/567',
        status: 'completed',
        code: 'Blood Pressure Check',
        priority: 'routine',
        requester: 'Practitioner/333',
        performer: 'Nurse/444',
        occurrenceDateTime: '2024-09-26T11:00:00',
        reasonCode: 'Hypertension'
      }
    ];
  </script>
  
  <style>
    .referral {
      border-bottom: 1px solid #ccc;
      padding: 1em 0;
    }
  
    .referral h4 {
      margin: 0;
    }
  </style>
  
  <h3>Completed Referrals</h3>
  
  {#each completedReferrals as referral}
    <div class="referral">
      <h4>Referral ID: {referral.id}</h4>
      <p><strong>Patient:</strong> {referral.subject}</p>
      <p><strong>Service Requested:</strong> {referral.code}</p>
      <p><strong>Status:</strong> {referral.status}</p>
      <p><strong>Priority:</strong> {referral.priority}</p>
      <p><strong>Requester:</strong> {referral.requester}</p>
      <p><strong>Performer:</strong> {referral.performer}</p>
      <p><strong>Reason:</strong> {referral.reasonCode}</p>
      <p><strong>Completed Time:</strong> {referral.occurrenceDateTime}</p>
    </div>
  {/each}
  