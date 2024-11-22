<script>
    import { workflowStore } from '$lib/stores/workflow';
    
    export let workflow = null;
    let planDefinition = null;
    let requestGroups = [];
  
    $: if (workflow) {
      planDefinition = generatePlanDefinition(workflow);
      requestGroups = generateRequestGroups(workflow);
    }
  
    function generatePlanDefinition(workflow) {
      const triggers = workflow.nodes.filter(n => n.type.includes('event'));
      const actions = workflow.nodes.filter(n => !n.type.includes('event'));
  
      return {
        resourceType: "PlanDefinition",
        status: "draft",
        action: triggers.map(trigger => ({
          trigger: [{
            type: getTriggerType(trigger.type),
            name: trigger.id,
            condition: trigger.data?.condition
          }],
          action: getActionsForTrigger(trigger.id, actions, workflow.edges)
        }))
      };
    }
  
    function generateRequestGroups(workflow) {
      const parallelGroups = workflow.nodes.filter(n => n.type === 'parallel');
      
      return parallelGroups.map(group => ({
        resourceType: "RequestGroup",
        status: "draft",
        action: group.data.actions.map(actionId => ({
          id: actionId,
          groupingBehavior: "logical-group",
          selectionBehavior: "all",
          resource: {
            reference: `ActivityDefinition/${actionId}`
          }
        }))
      }));
    }
  </script>
  
  <div class="p-4">
    <h3 class="text-lg font-semibold mb-4">Generated FHIR Resources</h3>
    
    {#if planDefinition}
      <div class="mb-4">
        <h4 class="font-medium">PlanDefinition</h4>
        <pre class="bg-gray-100 p-4 rounded">
          {JSON.stringify(planDefinition, null, 2)}
        </pre>
      </div>
    {/if}
  
    {#if requestGroups.length}
      <div>
        <h4 class="font-medium">RequestGroups</h4>
        {#each requestGroups as group}
          <pre class="bg-gray-100 p-4 rounded mt-2">
            {JSON.stringify(group, null, 2)}
          </pre>
        {/each}
      </div>
    {/if}
  </div>