<!-- src/lib/components/UserProfile.svelte -->
<script>
  export let userData = null;
  export let currentOrgName = null;

  console.log ("In UserProfile userData:"+JSON.stringify(userData)+" orgname:"+currentOrgName);
  
</script>

<style>
  .user-profile {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 1px;
    padding: 20px;
  }

  .user-info {
    display: flex;
    align-items: flex-start; /* Aligns text at the top */
  }

  .user-profile img {
    border-radius: 50%;
    width: 50px;
    height: 50px;
    object-fit: cover;
    margin-right: 10px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .name {
    font-weight: bold;
    font-size: 16px;
  }

  .email {
    font-size: 14px;
    color: #555;
    margin-top: 5px; /* Small spacing between name and email */
  }
</style>

{#if userData}
  <div class="user-profile">
    <div class="user-info">
      <img src="{userData.picture}" alt="{userData.name}'s profile picture" />
      <div class="user-details">
        <div class="name">{userData.name} at {currentOrgName}</div>
        <div class="email">{userData.email}</div>
      </div>
    </div>
  </div>
{/if}
