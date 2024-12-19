<script>
    export let selectedTemplate;
    console.log('ActivityDefinitionEditor initializing with selectedTemplate:', selectedTemplate);
</script>

<div style="background: red; padding: 20px; margin: 20px;">
    <h1>TEST EDITOR</h1>
    <pre>{JSON.stringify(selectedTemplate, null, 2)}</pre>
</div>