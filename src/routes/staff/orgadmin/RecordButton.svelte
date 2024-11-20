<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let recording = false;
  let mediaRecorder;
  let audioChunks = [];
  let audioStream;
  
  let transcription = '';
  let structuredAvailability = null;
  let error = '';

  let isProcessingAudio = false;
  let isStructuringTranscription = false;

  function formatJson(json) {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch (e) {
      return json;
    }
  }

  async function startRecording() {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(audioStream);
      
      audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      mediaRecorder.start();
      recording = true;
      error = '';
    } catch (err) {
      console.error('Error accessing microphone:', err);
      error = 'Error accessing microphone. Please ensure you have given permission.';
    }
  }

  async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      recording = false;
      isProcessingAudio = true;

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch(`${base}/api/availability/send-audio`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            transcription = result.transcription;
            console.log('Response from server:', result);
          } else {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
          }
        } catch (err) {
          console.error('Error sending audio:', err);
          error = `Error: ${err.message}`;
        } finally {
          isProcessingAudio = false;
        }
      };
    }
  }

  async function structureTranscription() {
    if (!transcription) {
      error = 'No transcription available to structure.';
      return;
    }

    isStructuringTranscription = true;
    try {
      const response = await fetch(`${base}/api/availability/deriveAvailabilityFromText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcription }),
      });

      if (response.ok) {
        const result = await response.json();
        structuredAvailability = result.structuredData;
      } else {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error structuring transcription:', err);
      error = `Error: ${err.message}`;
    } finally {
      isStructuringTranscription = false;
    }
  }

  function handleClickScoreAvailability() {
    dispatch('availabilityProcessed', { structuredAvailability });
  }
</script>

<style>
.container {
  display: flex;
  gap: 20px;
}

.button-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.content-column {
  flex: 1;
}

.btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
}

.btn:hover {
  background-color: #45a049;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.btn.active {
  background-color: #81c784;
}

.error {
  color: red;
  margin-top: 10px;
}

.transcription, .structured-result {
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
}

.structured-result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

<div class="container">
<div class="button-column">
  <button
    class="btn {recording ? 'active' : ''}"
    on:mousedown={startRecording}
    on:mouseup={stopRecording}
    on:mouseleave={stopRecording}
    disabled={isProcessingAudio}
  >
    {#if isProcessingAudio}
      Processing...
    {:else}
      {recording ? 'Recording...' : 'Press to Record'}
    {/if}
  </button>

  <button 
    class="btn" 
    on:click={structureTranscription} 
    disabled={!transcription || isStructuringTranscription}
  >
    {isStructuringTranscription ? 'Structuring...' : 'Structure Transcription'}
  </button>

  <button 
    class="btn" 
    on:click={handleClickScoreAvailability} 
    disabled={!structuredAvailability}
  >
    Apply
  </button>

  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>

<div class="content-column">
  {#if transcription}
    <div class="transcription">
      <strong>Transcription:</strong>
      <p>{transcription}</p>
    </div>
  {/if}

  {#if structuredAvailability}
    <div class="structured-result">
      <strong>Structured Availability:</strong>
      <pre>{formatJson(JSON.stringify(structuredAvailability))}</pre>
    </div>
  {/if}
</div>
</div>