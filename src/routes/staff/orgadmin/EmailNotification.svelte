// src/routes/EmailNotification.svelte
<script>
import axios from 'axios';
import { exc_checkResults } from '$lib/stores';

export let API_URL;

let email = '';
let emailStatus = '';

function generateEmailContent() {
  let content = '<h2>Exclusion Check Results</h2>';
  content += '<table border="1"><tr><th>Name</th><th>SAM Match</th><th>OIG Match</th><th>CO Match</th></tr>';
  for (const result of $exc_checkResults) {
    content += `<tr>
      <td>${result.name}</td>
      <td>${result.samMatch ? '❌' : '✅'}</td>
      <td>${result.oigMatch ? '❌' : '✅'}</td>
      <td>${result.coMatch ? '❌' : '✅'}</td>
    </tr>`;
  }
  content += '</table>';
  return content;
}

async function sendEmail() {
  const content = generateEmailContent();
  try {
    await axios.post(`${API_URL}/email`, {
      to: email,
      subject: 'Exclusion Check Results',
      html: content
    });
    emailStatus = 'Email sent successfully';
  } catch (error) {
    emailStatus = `Error sending email: ${error.message}`;
  }
}
</script>

<div>
  <input type="email" bind:value={email} placeholder="Enter email address">
  <button on:click={sendEmail}>Send Results via Email</button>
</div>

{#if emailStatus}
  <p>{emailStatus}</p>
{/if}

<style>
  div {
    margin-top: 20px;
  }
  input {
    margin-right: 10px;
  }
</style>