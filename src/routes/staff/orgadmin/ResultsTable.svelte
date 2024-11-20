<script>
    import { exc_checkResults } from '$lib/stores';
    </script>
    
    {#if $exc_checkResults.length > 0}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SAM Match</th>
            <th>OIG Match</th>
            <th>CO Match</th>
          </tr>
        </thead>
        <tbody>
          {#each $exc_checkResults as result}
            <tr>
              <td>{result.name}</td>
              <td>{result.samMatch ? '❌' : '✅'}</td>
              <td>{result.oigMatch ? '❌' : '✅'}</td>
              <td>{result.coMatch ? '❌' : '✅'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>No results to display</p>
    {/if}
    
    <style>
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
    </style>