<script>
  import { onMount, onDestroy } from 'svelte';
  import { user, setUser, clearUserStore, abilities, updateAbilities } from '$lib/stores.js';
  import { hasFetchedPractitionerData, isUserAuthenticated } from '$lib/stores.js';
  
  import { goto } from '$app/navigation';
  import Navigation from './Navigation.svelte';
  import UserProfile from './UserProfile2.svelte';
  import HomepageText from './HomepageText.svelte';
  import LoginChooseOrg from './LoginChooseOrg.svelte';
  import GetInviteCode from './GetInviteCode.svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { writable } from 'svelte/store';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';

  console.log('user store type:', typeof user);
  console.log('user store methods:', Object.keys(user));
  console.log('abilities store type:', typeof abilities);
  console.log('abilities store methods:', Object.keys(abilities));

 let sidebarWidth = 250; // Default width
 let isDragging = false;
 let minWidth = 150;  // Minimum sidebar width
 let maxWidth = 500; // Maximum sidebar width

 function startDragging(e) {
  isDragging = true;
    // Add user-select: none to both sidebar and main content
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleDragging);
    window.addEventListener('mouseup', stopDragging);
 }

 function handleDragging(e) {
   if (!isDragging) return;
   sidebarWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
 }

 function stopDragging() {
  isDragging = false;
    // Remove user-select: none when dragging stops
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleDragging);
    window.removeEventListener('mouseup', stopDragging);
 }


  let isLoading = true;
  let errorMessage = writable('');

  let fetchError='';


  let isHomePage = false;
  let serving_dev = false;
  let currentOrgName = "";
  let selectedPractitionerRole = null;

  // Subscribe to the user store
  let unsubscribeUser;
  let unsubscribeAbilities;

  $: if (browser && $user) {
    isUserAuthenticated.set(!!$user?.user?.id);
    console.log("+layout Reactive User data:", JSON.stringify($user));
  }

  // Home page detection
  $: isHomePage = browser ? $page.url.pathname === `${base}/` : false;

  // Access environment variable using import.meta.env
  if (browser && import.meta.env.VITE_RUNTIME_ENV === "dev") {
    serving_dev = true;
  }

  onMount(async () => {
  if (!browser) return;
  
  console.log("+layout in onMount");
  isLoading = true;

  try {
    console.log("+layout in onMount, before checkUserAuthStatus 1");
    const r = await checkUserAuthStatus();
    console.log("+layout in onMount, before checkUserAuthStatus 2");
    isUserAuthenticated.set(r);

    console.log("+layout in onMount, before checkUserAuthStatus 3");
    let  currentUserData = get(user);
    console.log ("+layout,onMount currentUserdata:",JSON.stringify(currentUserData));
    console.log ("+layout,onMount r:",r);
    console.log ("+layout,onMount hasFetchPractData:",hasFetchedPractitionerData());

    if (r && currentUserData?.user?.email && !hasFetchedPractitionerData()) {
      console.log ("+layout onmount 1");
      await fetchPractitionerData(currentUserData.user.email);
      console.log ("+layout onmount 2");
      currentUserData = get(user);
      if (currentUserData?.practitioner?.Pid) {
        console.log ("+layout onmount 3");
        await fetchPractitionerRoles(currentUserData.practitioner.Pid);
        console.log ("+layout onmount 4");
      }
    }
    return () => {
     window.removeEventListener('mousemove', handleDragging);
     window.removeEventListener('mouseup', stopDragging);
   };

  } catch (error) {
    console.error('Mount error:', error);
  } finally {
    isLoading = false;
  }
});

async function checkUserAuthStatus() {
  console.log("+layout,in checkUserAuth 1");
  if ($isUserAuthenticated) {
    return true;
  }

  console.log("+layout,in checkUserAuth 2");

  try {
    console.log("+layout,in checkUserAuth 3, base_path:", base);
    const url = `${base}/auth/user`;
    console.log("Fetching URL:", url);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    console.log("+layout,in checkUserAuth 4");

    if (response.ok) {
      const userDataL = await response.json();
      console.log("+layout,in checkUserAuth 5");
      console.log("+layout fetchUserDate L", JSON.stringify(userDataL));

      setUser(userDataL);
      isUserAuthenticated.set(true);
      return true;
    } else {
      $errorMessage = '+layout-checkUserAuthState - user not logged in to fb/google.';
      return false;
    }
  } catch (error) {
    console.error('+layout-checkUserAuthState, Error fetching user data:', error);
    return false;
  }
}


 // Function to get the full name from the name object
 function getFullName(nameObject) {
    if (!nameObject || !Array.isArray(nameObject) || nameObject.length === 0) {
      return '';
    }
    const nameEntry = nameObject[0];
    const givenNames = nameEntry.given ? nameEntry.given.join(' ') : '';
    const familyName = nameEntry.family || '';
    return `${givenNames} ${familyName}`.trim();
  }


async function fetchPractitionerData(email) {
    if (hasFetchedPractitionerData()) {
      console.log("Practitioner data already fetched, skipping fetch");
      return;
    }
    try {
      const response = await fetch(`${base}/api/practitioner/findWithEmail?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const practId = data[0]?.id || null;
          const practName = getFullName(data[0]?.name) || 'Unknown Practitioner';

          user.update(store => ({
            ...store,
            practitioner: {
              ...store.practitioner,
              Pid: practId,
              name: practName,
          //    roles: userRoles
            }
          }));

        //  updateAbilities(userRoles);
          
          console.log("+layout/fetchPractDataEmail prID:" + practId);
          console.log("+layout/fetchPractDataEmail name:" + practName);

         // await fetchPractitionerRoles(practId);
        } else {
          console.error('No practitioner data found for the provided email.');
          fetchError = 'No practitioner data found for the provided email.';
        }
      } else {
        throw new Error('Failed to fetch practitioner data');
      }
    } catch (error) {
      console.error('Error fetching practitioner data:', error);
      fetchError = 'Unable to retrieve practitioner information. Please try again later.';
    }
  }

 // Function to fetch PractitionerRoles by practitioner ID, deal with roles here, not in fetchPractitioner
 async function fetchPractitionerRoles(practitionerId) {
  try {
    const response = await fetch(`${base}/api/role/PractitionerRole?practitioner=${encodeURIComponent(practitionerId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      const bundle = await response.json();
      const entries = Array.isArray(bundle.entry) ? bundle.entry : [];

      let practitionerRoles = entries
        .map(entry => entry.resource)
        .filter(resource => resource.resourceType === 'PractitionerRole');

      console.log('Filtered PractitionerRoles:', practitionerRoles);

      const seenOrgRefs = new Set();
      const  tempLocalOrgArray = [];

      // Use Promise.all to wait for all asynchronous operations to complete
      await Promise.all(practitionerRoles.map(async (role) => {
      if (role.organization && role.organization.reference) {
        const orgRef = role.organization.reference;
        if (!seenOrgRefs.has(orgRef)) {
          seenOrgRefs.add(orgRef);
          let orgName = await getOrganizationName(orgRef);
          tempLocalOrgArray.push({ name: orgName, id: orgRef });
        }
      }
    }));

    // After all async operations, deduplicate based on id
    console.log (".id tracker 8");
    let localOrgArray = Array.from(new Map(tempLocalOrgArray.map(item => [item.id, item])).values());
    console.log('Populated localOrgArray:', localOrgArray);

    user.update(store => ({
        ...store,
        practitioner: {
          ...store.practitioner,
          practitionerRoles,
          localOrgArray
        }
      }));

      console.log('Updated user store with PractitionerRoles');
      console.log('fetchPR localOrglength:' + localOrgArray.length);

      // Now check the length of localOrgArray after it has been fully populated
      if (localOrgArray.length > 1) {
        console.log('Showing role selection');
      } else if (localOrgArray.length === 1) {
        console.log("+layout/fetchPR only one Pract");
        selectPractitionerRole(practitionerRoles[0], localOrgArray[0].name);
      } else {
        console.error('No valid PractitionerRole resources found.');
        fetchError = 'No valid roles found for the practitioner.';
      }
    } else {
      throw new Error('Failed to fetch practitioner roles');
    }
  } catch (error) {
    console.error('Error fetching practitioner roles:', error);
    fetchError = 'Unable to retrieve practitioner roles. Please try again later.';
  }
}

function selectPractitionerRole(selectedRole, orgName) {
  console.log('Selecting role:', selectedRole, 'for organization:', orgName);

  if (!selectedRole || typeof selectedRole !== 'object') {
    console.error('Invalid role selected:', selectedRole);
    return;
  }

  currentOrgName = orgName;
  const userRoles = (selectedRole.code || [])
    .flatMap(c =>
      (c.coding || [])
        .filter(code => code.system === 'https://combinebh.org/cori-value-set/')
        .map(code => code.code)
    )
    .filter(code => code);

  const organizationReference = selectedRole.organization?.reference;
  const organizationId = organizationReference ? organizationReference.split('/')[1] : null;

  console.log("+layout selectPractitionerRole: Updated userRoles:", userRoles);

  console.log (".id tracker 1");
  user.update(store => ({
    ...store,
    practitioner: {
      ...store.practitioner,
      organizationId: organizationId,
      organizationName: orgName || 'Unknown Organization',
      PRid: selectedRole.id || 'unknown',
      roles: userRoles
    }
  }));
  selectedPractitionerRole = selectedRole;
  updateAbilities(userRoles);
 
}



  // Function to fetch organization name by reference
  async function getOrganizationName(orgReference) {
    try {
      const response = await fetch(`${base}/api/organization/getOrgName?reference=${encodeURIComponent(orgReference)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch organization name: ${response.statusText}`);
      }

      let data = await response.text();
      if (data) {
        data = data.replace(/^"|"$/g, '');
      }
      return data || 'Unknown Organization';
    } catch (error) {
      console.error(`Error fetching organization name: ${error}`);
      return 'Unknown Organization';
    }
  }


  onDestroy(() => {
    if (browser) {     
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleDragging);
      window.removeEventListener('mouseup', stopDragging);
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeAbilities) unsubscribeAbilities();
    }
  });



  // Updated handleOrgSelected function
  async function handleOrgSelected(event) {
    const { practitionerRoleId, orgId, orgName } = event.detail;
    console.log(`Organization selected: Role ID: ${practitionerRoleId}, Org ID: ${orgId}, Org Name: ${orgName}`);
    
    // Find the matching PractitionerRole from the existing roles
    const selectedRole = $user.practitioner.practitionerRoles.find(role => role.id === practitionerRoleId);
    
    if (selectedRole) {
      // Call selectPractitionerRole with the found role and organization name
      selectPractitionerRole(selectedRole, orgName);
    } else {
      console.error('Could not find matching PractitionerRole');
    }
  }


  // the login handlers move the login flow to the server
  // the server has a callback which loads session data and not much more
  // ... then it reloads this page, which needs to check if the session data is present. 
  // if session data is present, check for current pract, practRole in store user.user
  // 

  async function handleGoogleLogin() {
    if (!browser) return;
    try {
      const authUrl = `${base}/auth/google/url`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during Google login:', error);
    }
  }

  async function handleFBLogin() {
    if (!browser) return;
    try {
      const authUrl = `${base}/auth/facebook/url`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during Facebook login:', error);
    }
  }

  async function handleLogout() {
  if (!browser) return;
  try {

    const response = await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    console.log ("in handlelogout, auth/logout response:", response);  
    clearUserStore(); // This clears the user store, setting the value to null
    isUserAuthenticated.set(false); // Explicitly set user authenticated status to false

    goto(`${base}/`); // Redirect to the homepage or login page after logout
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

async function handleInviteCode(event) {
  const { inviteCode } = event.detail;
  console.log('Processing-2 invite code:', inviteCode,"name:", $user?.user?.name);
  
  try {
    const response = await fetch(`${base}/api/practitioner/updateEmailFromCode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namestring : $user?.user?.name,
        code: inviteCode,
        email: $user?.user?.email,
        
      }),
      credentials: 'include'
    });

    if (response.ok) {
      // Show success message before logout
      alert('Invite code accepted. Please log in again to continue.');
      
      // Call handleLogout to clear the session
      await handleLogout();
      
      // Redirect to home page (this may be redundant since handleLogout likely includes a redirect)
      goto(`${base}/`);
    } else {
      // Display specific error message for invalid codes
      errorMessage.set('Check with your administrator for a valid invite code.');
      console.error('Invalid invite code response:', response.statusText);
    }
  } catch (error) {
    // Set error message for any other errors
    errorMessage.set('Check with your administrator for a valid invite code.');
    console.error('Error processing invite code:', error);
  }
}

</script>

<div class="app-container">
   <aside class="sidebar" style="width: {sidebarWidth}px">
    <div class="sidebar-content">
      <div class="sidebar-header">
        <a href="{base}" class="sidebar-logo-container">
          <img src="{base}/apple-touch-icon.png" alt="Logo" class="sidebar-logo" />
          <div class="sidebar-title">
            Colorado<br />
            Referral<br />
            Information
          </div>
        </a>
        {#if serving_dev}
           <div class="development-banner">Development Server</div>
        {/if}
      </div>
    </div>

    <div class="navigation-container">
      <Navigation />
    </div>

    <div class="footer-links">
      <div class="auth-buttons">
        {#if browser}
          {#if $user?.user?.id}
            
            <button class="nav-button logout" on:click={handleLogout} aria-label="Log Out">Logout</button>
          {:else}
            <button class="nav-button" on:click={handleGoogleLogin} aria-label="Log In with Google">Login with Google</button>
            <button class="nav-button" on:click={handleFBLogin} aria-label="Log In with Facebook">Login with Facebook</button>
          {/if}
        {:else}
          <!-- Placeholder for SSR -->
          <div class="nav-button">Login</div>
        {/if}
      </div>
      <a href="{base}/TOS" class="footer-link">Cori Terms of Service</a>
      <a href="{base}/PrivacyPolicy" class="footer-link">Privacy Policy</a>
      <span class="copyright">© 2024 Cori, a Colorado 501(c)(3)</span>
    </div>
  </aside>

  <div 
  class="drag-handle" 
  on:mousedown={startDragging}
  class:dragging={isDragging}
  style="left: {sidebarWidth}px"
></div>

<main class="main-content">
  {#if browser}
    {#if isLoading}
      <p>Loading user data...</p>
    {:else}
      {#if !$user?.practitioner?.Pid && $user?.user?.id}
        <GetInviteCode on:submitInviteCode={handleInviteCode} />
      {:else if !selectedPractitionerRole && $isUserAuthenticated}
        <LoginChooseOrg practitionerId={$user.practitioner?.Pid} on:OrgSelected={handleOrgSelected} />
      {:else}
        {#if $user?.user?.id}
          <div class="user-info">
            <UserProfile userData={$user?.user} {currentOrgName} />
          </div>
        {/if}
      {/if}
      
      {#if isHomePage}
        <HomepageText />
      {/if}

      <slot></slot>
    {/if}
  {/if}
</main>
  
</div> 


<style>

.navigation-container {
  flex: 1; /* Allow it to grow and fill available space */
  overflow-y: auto; /* Enable scrolling if content overflows */
  padding: 0 20px 20px 20px; /* Add some padding */

}

  .app-container {
    display: flex;
    height: 100vh;
    position: relative;
    user-select: none;
  }

  .main-content {
   flex: 1;
   overflow-y: auto;
   padding: 20px;
   user-select: text;
 }



 .drag-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #ddd;  /* Light gray visible line */
  cursor: ew-resize;
  z-index: 10;
  user-select: none;
    /* Center the visible part */
  display: flex;
  justify-content: center;
}


.drag-handle:hover::after, .drag-handle.dragging::after {
    background: #666;
  }

.drag-handle::after {
    content: '';
    width: 2px;
    height: 100%;
    background: #999;
    /* Only show the center 2px for visual appeal */
  }


  .sidebar {
   flex: none;  /* Changed from fixed width */
   display: flex;
   flex-direction: column;
   background-color: #f8f9fa;
   height: 100vh;
   overflow-y: hidden;
   transition: width 0.1s ease;
   user-select: text;
 }

  .sidebar-content {
    flex: none;
    padding: 20px;
  }

  .sidebar-header {
    margin-bottom: 20px;
  }

  .sidebar-logo-container {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
  }

  .sidebar-logo {
    width: 60px;
    height: auto;
    margin-right: 10px;
  }

  .sidebar-title {
    font-size: 18px;
    font-weight: bold;
    line-height: 1.2;
  }

  .auth-buttons {
    margin-top: 20px;
  }

  .nav-button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 10px;
    width: 100%;
  }

  .nav-button:hover {
    background-color: #3399ff;
  }

  .nav-button.logout {
    background-color: #dc3545;
  }

  .nav-button.logout:hover {
    background-color: #ff6b6b;
  }

  .footer-links {
    padding: 20px;
    background-color: #f0f0f0;
  }

  .footer-link {
    text-decoration: none;
    color: inherit;
    margin-bottom: 5px;
  }

  .footer-link:hover {
    color: rgb(172, 172, 172);
  }

  .copyright {
    font-size: 12px;
    margin-top: 10px;
  }

   /* Responsive adjustments */
 @media (max-width: 768px) {
   .sidebar-title {
     font-size: 14px;
   }
   
   .nav-button {
     font-size: 14px;
     padding: 6px 10px;
   }

   .footer-link {
     font-size: 12px;
   }
 }
</style>
