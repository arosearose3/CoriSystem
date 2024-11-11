<script>
    export let json;

    function syntaxHighlight(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    $: highlightedJson = syntaxHighlight(json);
</script>

<pre class="json-preview">
    {@html highlightedJson}
</pre>

<style>
    .json-preview {
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 15px;
        margin: 0;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
        font-size: 14px;
        line-height: 1.4;
        max-height: 400px;
        overflow-y: auto;
    }

    .json-preview :global(.string) { color: #22863a; }
    .json-preview :global(.number) { color: #005cc5; }
    .json-preview :global(.boolean) { color: #005cc5; }
    .json-preview :global(.null) { color: #005cc5; }
    .json-preview :global(.key) { color: #24292e; }
</style>