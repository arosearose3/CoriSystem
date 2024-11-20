// planDefinitionService.js - PlanDefinition operations
export async function findMatchingPlans(eventType, eventSource) {
    const accessToken = await getFhirAccessToken();
  
    let searchUrl = `${FHIR_BASE_URL}/PlanDefinition?`;
    
    switch (eventType) {
      case 'subscription':
        searchUrl += `trigger-event-source=${eventSource}`;
        break;
      case 'webhook':
        searchUrl += `trigger-webhook=${eventSource}`;
        break;
      case 'timer':
        searchUrl += `trigger-timer=${eventSource}`;
        break;
    }
  
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });
  
    return handleBlobResponse(response.data);
  }
  
  export async function executePlanDefinition(plan, context) {
    const accessToken = await getFhirAccessToken();
  
    // Call $apply operation
    const applyUrl = `${FHIR_BASE_URL}/PlanDefinition/${plan.id}/$apply`;
    
    const parameters = {
      resourceType: 'Parameters',
      parameter: [{
        name: 'eventContext',
        resource: {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'eventType',
              valueString: context.eventType
            },
            {
              name: 'eventSource',
              valueString: context.eventSource
            },
            {
              name: 'payload',
              valueString: JSON.stringify(context.payload)
            },
            {
              name: 'auditEventId',
              valueString: context.auditEventId
            }
          ]
        }
      }]
    };
  
    const response = await axios.post(
      applyUrl,
      parameters,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );
  
    return handleBlobResponse(response.data);
  }
  
  function getSourceReference(eventType, eventSource) {
    switch (eventType) {
      case 'subscription':
        return `Subscription/${eventSource}`;
      case 'webhook':
        return `Endpoint/${eventSource}`;
      case 'timer':
        return `Basic/${eventSource}`;
      default:
        return `Device/unknown`;
    }
  }
  