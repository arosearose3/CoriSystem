<script>
    import axios from 'axios';
    import { exc_checkResults } from '$lib/stores';
    
    export let API_URL;
    
    async function performCheck() {
      try {
        const response = await axios.post(`${API_URL}/check`);
        exc_checkResults.set(response.data);
      } catch (error) {
        console.error('Error performing check:', error);
      }
    }
    </script>
    
    <button on:click={performCheck}>Perform Exclusion Check</button>
    