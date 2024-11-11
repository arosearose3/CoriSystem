<script>
    // PlanDefinitionVisualizer.svelte
    import mermaid from 'mermaid';
    import { onMount } from 'svelte';
    
    export let planDefinition = {};
    
    let flowchartContainer;
    
    // Initialize mermaid
    onMount(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });
    });
    
    // Generate trigger nodes from PlanDefinition
    function generateTriggerNodes(triggers) {
        if (!triggers || !triggers.length) return '';
        
        let nodes = 'subgraph Triggers["Triggers (Events)"]\\n';
        triggers.forEach((trigger, index) => {
            const id = `T${index + 1}`;
            const label = trigger.type === 'named-event' ? 
                trigger.name : 
                trigger.type === 'data-changed' ? 
                    `Data: ${trigger.data?.path}` : 
                    `${trigger.type}`;
            nodes += `    ${id}[${label}]\\n`;
        });
        nodes += 'end\\n';
        return nodes;
    }
    
    // Generate condition nodes from PlanDefinition
    function generateConditionNodes(conditions) {
        if (!conditions || !conditions.length) return '';
        
        let nodes = 'subgraph Conditions\\n';
        conditions.forEach((condition, index) => {
            const id = `C${index + 1}`;
            const label = condition.expression?.description || 
                         condition.expression?.expression ||
                         `Condition ${index + 1}`;
            nodes += `    ${id}{${label}}\\n`;
        });
        nodes += 'end\\n';
        return nodes;
    }
    
    // Generate action nodes from PlanDefinition
    function generateActionNodes(actions) {
        if (!actions || !actions.length) return '';
        
        let nodes = 'subgraph Actions\\n';
        actions.forEach((action, index) => {
            const id = `A${index + 1}`;
            const label = action.title || 
                         action.description ||
                         `${action.type || 'Action'} ${index + 1}`;
            nodes += `    ${id}[${label}]\\n`;
        });
        nodes += 'end\\n';
        return nodes;
    }
    
    // Generate connections between nodes
    function generateConnections(planDef) {
        let connections = '';
        
        // Connect triggers to first condition if exists
        if (planDef.trigger?.length && planDef.condition?.length) {
            planDef.trigger.forEach((_, index) => {
                connections += `T${index + 1} --> C1\\n`;
            });
        }
        
        // Connect conditions sequentially
        if (planDef.condition?.length) {
            for (let i = 1; i < planDef.condition.length; i++) {
                connections += `C${i} -->|True| C${i + 1}\\n`;
                connections += `C${i} -->|False| Stop[Stop Processing]\\n`;
            }
            
            // Connect last condition to actions
            const lastCondIndex = planDef.condition.length;
            connections += `C${lastCondIndex} -->|True| Actions\\n`;
            connections += `C${lastCondIndex} -->|False| Stop[Stop Processing]\\n`;
        }
        
        return connections;
    }
    
    // Generate the complete flowchart definition
    function generateFlowchart(planDef) {
        return `
    flowchart TD
        ${generateTriggerNodes(planDef.trigger)}
        ${generateConditionNodes(planDef.condition)}
        ${generateActionNodes(planDef.action)}
        ${generateConnections(planDef)}
        
        style Triggers fill:#f9f,stroke:#333
        style Conditions fill:#bbf,stroke:#333
        style Actions fill:#bfb,stroke:#333
        style Stop fill:#fbb,stroke:#333
        `.trim();
    }
    
    // Update the flowchart when planDefinition changes
    $: if (flowchartContainer && planDefinition) {
        const flowchartDefinition = generateFlowchart(planDefinition);
        mermaid.render('flowchart', flowchartDefinition).then(({ svg }) => {
            flowchartContainer.innerHTML = svg;
        });
    }
    </script>
    
    <div class="flow-container">
        <div bind:this={flowchartContainer}></div>
    </div>
    
    <style>
    .flow-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }
    
    .flow-container :global(svg) {
        width: 100%;
        height: auto;
    }
    </style>