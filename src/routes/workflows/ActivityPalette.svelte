// ActivityPalette.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import ActivityGroup from './ActivityGroup.svelte';

  const dispatch = createEventDispatcher();


    
    const categories = [
      {
      name: 'Forms & Assessment',
      description: 'Data collection activities',
      items: [
        { type: 'send-questionnaire', title: 'Send Questionnaire',
          properties: {
             recipientId: { type: 'string', label: 'Recipient ID', required: true },
          
          } },
        { type: 'process-response', title: 'Process Response',
          properties: {
 recipientId: { type: 'string', label: 'Recipient ID', required: true },

          } }
      ]
    },
    {
      name: 'Communication',
      description: 'Messaging and notifications',
      items: [
        { 
          type: 'send-notification',
          title: 'Send Notification',
          properties: {
            channel: { type: 'string', label: 'Channel', required: true, options: ['sms', 'email', 'push'] },
            template: { type: 'string', label: 'Template ID', required: true },
            recipientId: { type: 'string', label: 'Recipient ID', required: true },
            variables: { type: 'object', label: 'Template Variables' }
          }
        },
        {
          type: 'record-consent',
          title: 'Record Consent',
          properties: {
            patientId: { type: 'string', label: 'Patient ID', required: true },
            consentType: { type: 'string', label: 'Consent Type', required: true },
            policyUri: { type: 'string', label: 'Policy URI' },
            effectiveDate: { type: 'date', label: 'Effective Date' }
          }
        }
      ]
    },
    {
      name: 'Clinical',
      description: 'Clinical workflow activities',
      items: [
        {
          type: 'create-referral',
          title: 'Create Referral',
          properties: {
            patientId: { type: 'string', label: 'Patient ID', required: true },
            serviceType: { type: 'string', label: 'Service Type', required: true },
            urgency: { type: 'string', label: 'Urgency', options: ['routine', 'urgent', 'asap'] },
            specialtyId: { type: 'string', label: 'Specialty ID' },
            notes: { type: 'text', label: 'Clinical Notes' }
          }
        },
        {
          type: 'record-health-concern',
          title: 'Record Health Concern',
          properties: {
            patientId: { type: 'string', label: 'Patient ID', required: true },
            concernCode: { type: 'string', label: 'Concern Code', required: true },
            severity: { type: 'string', label: 'Severity', options: ['low', 'medium', 'high'] },
            status: { type: 'string', label: 'Status', options: ['active', 'resolved'] }
          }
        }
      ]
    },
    {
      name: 'Service Delivery',
      description: 'Service management activities',
      items: [
        {
          type: 'schedule-service',
          title: 'Schedule Service',
          properties: {
            patientId: { type: 'string', label: 'Patient ID', required: true },
            serviceId: { type: 'string', label: 'Service ID', required: true },
            providerId: { type: 'string', label: 'Provider ID' },
            preferredDate: { type: 'date', label: 'Preferred Date' },
            duration: { type: 'number', label: 'Duration (minutes)' }
          }
        },
        {
          type: 'verify-eligibility',
          title: 'Verify Eligibility',
          properties: {
            patientId: { type: 'string', label: 'Patient ID', required: true },
            insuranceId: { type: 'string', label: 'Insurance ID', required: true },
            serviceCode: { type: 'string', label: 'Service Code' },
            providerNPI: { type: 'string', label: 'Provider NPI' }
          }
        }
      ]
    },
    {
      name: 'Integration',
      description: 'System integration activities',
      items: [
        {
          type: 'synchronize-resource',
          title: 'Synchronize Resource',
          properties: {
            resourceType: { type: 'string', label: 'Resource Type', required: true },
            resourceId: { type: 'string', label: 'Resource ID', required: true },
            targetSystem: { type: 'string', label: 'Target System', required: true },
            mappingId: { type: 'string', label: 'Mapping Configuration' }
          }
        },
        {
          type: 'check-benefits',
          title: 'Check Benefits',
          properties: {
            patientId: { type: 'string', label: 'Patient ID', required: true },
            insuranceId: { type: 'string', label: 'Insurance ID', required: true },
            benefitCategory: { type: 'string', label: 'Benefit Category' },
            serviceDate: { type: 'date', label: 'Service Date' }
          }
        }
      ]
    }
  ];

  function handleDragStart(event, item) {
  event.stopPropagation();
  
  if (item) {
    const data = {
      type: item.type,
      title: item.title,
      properties: item.properties || {},
      isActivity: true,
      // Add any additional metadata needed by FlowNode
      width: 200,
      height: 80
    };
    
    // Set both formats for maximum compatibility
    event.dataTransfer.setData('application/json', JSON.stringify(data));
    event.dataTransfer.setData('text/plain', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copy';
    
    // Optional: Create drag image
    const dragImage = event.target.cloneNode(true);
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    dispatch('dragstart', { item });
  }
}
</script>

<div class="palette-container" on:dragstart|stopPropagation>
  <h5 class="text-lg font-semibold mb-4">Activities</h5>

  {#each categories as category (category.name)}
    <ActivityGroup
      name={category.name}
      description={category.description}
    >
      {#each category.items as item (item.type)}
        <div
          class="palette-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, item)}
          on:mousedown|stopPropagation
        >
          <span class="select-text">{item.title}</span>
        </div>
      {/each}
    </ActivityGroup>
  {/each}
</div>
<style>
  .palette-container {
    height: 100%;
    background: #f9fafb;
    padding: 1rem;
    overflow-y: auto;
  }

  .palette-item {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    margin: 0.25rem 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: grab;
    transition: all 0.2s;
  }

  .palette-item:hover {
    background: #f3f4f6;
    transform: translateX(2px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .palette-item:active {
    cursor: grabbing;
    background: #e5e7eb;
  }

  /* Allow text selection */
  .select-text {
    user-select: text;
    cursor: text;
  }

  /* But keep grab cursor on the draggable container */
  .palette-item .select-text:hover {
    cursor: grab;
  }
</style>