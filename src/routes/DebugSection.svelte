<!-- DebugSection.svelte -->
<script>
  export let isUserAuthenticated;
  export let practitionerId;
  export let practitionerName;
  export let practitionerRoles;
  export let organizations;
  export let selectPractitionerRole;
  export let ability;
  export let handleLogin;
  export let handleLogout;
  export let handleConnectFhir;
  export let handleDisconnectFhir;
  export let isFhirAuthenticated;
  export let fhirError;
  export let userData;

  let permissions = ability?.rules.map(rule => `${rule.action} ${rule.subject}`).join(', ');
</script>

<div class="debug-section">
  <h3>Debug Information</h3>
  <ul>
    <li><strong>isUserAuthenticated:</strong> {isUserAuthenticated}</li>
    <li><strong>practitionerId:</strong> {practitionerId}</li>
    <li><strong>practitionerName:</strong> {practitionerName}</li>
    <li><strong>practitionerRoles:</strong> {JSON.stringify(practitionerRoles)}</li>
    <li><strong>organizations:</strong> {JSON.stringify(organizations)}</li>
    <li><strong>selectPractitionerRole:</strong> {selectPractitionerRole ? 'Function Available' : 'Not Available'}</li>
    <li><strong>ability:</strong> {JSON.stringify(ability)}</li>
    <li><strong>Ability Rules:</strong> {JSON.stringify(ability?.rules, null, 2)}</li>
    <li><strong>User Permissions:</strong> {permissions}</li>
    <li><strong>isFhirAuthenticated:</strong> {isFhirAuthenticated}</li>
    <li><strong>fhirError:</strong> {fhirError}</li>
    <li><strong>userData:</strong> {JSON.stringify(userData)}</li>
  </ul>
</div>

<style>
  .debug-section {
    width: 200px;
    margin-top: 20px;
    padding: 10px;
    background-color: #eef;
    border: 1px solid #99c;
    border-radius: 4px;
  }

  .debug-section h3 {
    margin-bottom: 10px;
    font-size: 16px;
    color: #333;
  }

  .debug-section ul {
    list-style: none;
    padding: 0;
  }

  .debug-section li {
    margin-bottom: 5px;
    font-size: 14px;
    color: #555;
  }

  .debug-section strong {
    color: #000;
  }
</style>
