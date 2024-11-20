<script>
    import DraggableDialog from './DraggableDialog.svelte';
    
    let showDialog = false;
    let textFieldValue = '';
    let textFieldRef;
    let textFieldFocused = false;
    
    function handleItemSelected(event) {
      // Get the text to insert
      const textToInsert = event.detail.text;
      
      // If the text field is focused, insert at cursor position
      if (textFieldRef && textFieldFocused) {
        const start = textFieldRef.selectionStart;
        const end = textFieldRef.selectionEnd;
        
        // Combine the text before the cursor, the new text, and the text after the cursor
        textFieldValue = textFieldValue.substring(0, start) + 
                        textToInsert + 
                        textFieldValue.substring(end);
        
        // Move the cursor after the inserted text
        setTimeout(() => {
          const newCursorPos = start + textToInsert.length;
          textFieldRef.setSelectionRange(newCursorPos, newCursorPos);
          textFieldRef.focus();
        }, 0);
      } else {
        // If not focused, append to the end
        textFieldValue += textToInsert;
      }
    }
    
    function handleFocus() {
      textFieldFocused = true;
    }
    
    function handleBlur() {
      // Use a small delay to ensure click events in the dialog are processed first
      setTimeout(() => {
        textFieldFocused = false;
      }, 0);
    }
</script>

<div class="page-content">
    <h1>Non-Modal Dialog Example</h1>
    
    <label>
      Enter Text:
      <input
        type="text"
        bind:value={textFieldValue}
        bind:this={textFieldRef}
        on:focus={handleFocus}
        on:blur={handleBlur}
        class="text-field"
      />
    </label>
    
    <button on:click={() => showDialog = true}>Show Dialog</button>
    <button on:click={() => showDialog = false} disabled={!showDialog}>
      Hide Dialog
    </button>
    
    {#if showDialog}
      <DraggableDialog 
        on:close={() => showDialog = false} 
        on:itemSelected={handleItemSelected}
      />
    {/if}
</div>

<style>
    .page-content {
      padding: 2rem;
      text-align: center;
    }
    
    label {
      display: block;
      margin-bottom: 1rem;
      font-weight: bold;
    }
    
    .text-field {
      padding: 0.5rem;
      font-size: 1rem;
      width: 80%;
      max-width: 300px;
      margin-bottom: 1rem;
    }
    
    button {
      margin: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      background-color: #007bff;
      color: white;
      transition: background-color 0.2s ease;
    }
    
    button:disabled {
      background-color: #ddd;
      cursor: not-allowed;
    }
    
    button:not(:disabled):hover {
      background-color: #0056b3;
    }
</style>