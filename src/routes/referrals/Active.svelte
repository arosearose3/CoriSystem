<!-- src/routes/referrals/Active.svelte -->
<script>
    let activeReferrals = [
      {
        id: 'SR001',
        subject: 'Patient/123',
        status: 'active',
        code: 'Blood Test',
        priority: 'routine',
        requester: 'Practitioner/456',
        performer: 'Lab/789',
        occurrenceDateTime: '2024-09-30T10:00:00',
        reasonCode: 'Checkup'
      },
      {
        id: 'SR002',
        subject: 'Patient/789',
        status: 'active',
        code: 'MRI Scan',
        priority: 'urgent',
        requester: 'Practitioner/987',
        performer: 'Hospital/654',
        occurrenceDateTime: '2024-10-01T08:00:00',
        reasonCode: 'Suspected Fracture'
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
  
  <h3>Active Referrals</h3>
  
  {#each activeReferrals as referral}
    <div class="referral">
      <h4>Referral ID: {referral.id}</h4>
      <p><strong>Patient:</strong> {referral.subject}</p>
      <p><strong>Service Requested:</strong> {referral.code}</p>
      <p><strong>Status:</strong> {referral.status}</p>
      <p><strong>Priority:</strong> {referral.priority}</p>
      <p><strong>Requester:</strong> {referral.requester}</p>
      <p><strong>Performer:</strong> {referral.performer}</p>
      <p><strong>Reason:</strong> {referral.reasonCode}</p>
      <p><strong>Scheduled Time:</strong> {referral.occurrenceDateTime}</p>
    </div>
  {/each}
  