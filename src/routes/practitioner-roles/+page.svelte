<script>
  //  import AssociatePractitionersOrganizations from './AssociatePractitionersOrganizations.svelte';
    import AssociatePractitionerPatient from './AssociatePractitionerPatient.svelte';
    import AllRoles from './AllRoles.svelte';
  //  import SetUserRoles from './SetUserRoles.svelte';

  //  import { currentPractitioner } from '$lib/stores.js';

  </script>
  
  <h2>Practitioner Roles</h2>

  

  <div class="practitioner-roles-container">
   
    <hr>
    <AssociatePractitionerPatient />
    <div class="top-row">
      <!-- <AllRoles /> -->
   
    </div>
    <div class="full-width">
    </div>
  </div>
  
  <style>
    .practitioner-roles-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  
    .top-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
  
    .full-width {
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
    }
  </style>