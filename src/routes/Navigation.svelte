<script>
  import { navItems } from '$lib/navConfig.js';
  import { user, abilities } from '$lib/stores.js';
  import { base } from '$app/paths';
  import { currentLanguage, activeTranslations } from '$lib/i18n';

  // Add translation reactive statement
  $: currentTranslations = $activeTranslations;
  
  // Create a reactive wrapper for translations
  $: translateText = (key) => {
    return currentTranslations[key] || key;
  };

  // Reactive variables
  $: userData = $user;
  $: ability = $abilities;
  $: userRoles = userData?.practitioner?.roles ?? [];
  $: hasSingleRole = userRoles.length === 1;

  // Initialize the expanded/collapsed state for each role to false
  let expandedRoles = {};

  // Initialize expandedRoles for each user role
  $: if (userRoles.length > 1) {
    expandedRoles = userRoles.reduce((acc, role) => {
      acc[role] = false;
      return acc;
    }, {});
  }

  function toggleRole(role) {
    expandedRoles = { ...expandedRoles, [role]: !expandedRoles[role] };
  }

  function hasAccess(action, subject) {
    return ability?.can(action, subject);
  }

  function belongsToRole(item, role) {
    return item.roles.includes(role) && hasAccess('view', item.subject);
  }

  // Add a function to get translated role name if needed
  $: getTranslatedRole = (role) => {
    const roleTranslationKey = `role_${role.toLowerCase()}`;
    return translateText(roleTranslationKey);
  };
</script>

<nav class="navigation">
  {#if userRoles.length > 0 && ability.rules.length > 0}
    {#if hasSingleRole}
      <!-- Single role view -->
      <ul class="nav-list single-role">
        {#each navItems.filter(item => belongsToRole(item, userRoles[0])) as item}
          <li class="nav-item">
            <a class="nav-link" href={item.path} aria-label={translateText(item.labelKey)}>
              {#if item.icon}
                <span class="nav-icon">{item.icon}</span>
              {/if}
              {translateText(item.labelKey)}
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <!-- Multiple roles view -->
      {#each userRoles as role}
        <div class="role-section">
          <div class="role-header" on:click={() => toggleRole(role)}>
            <span class="role-title">{getTranslatedRole(role)}</span>
            <span class="toggle-icon">{expandedRoles[role] ? '▲' : '▼'}</span>
          </div>
          <ul class="nav-list" class:expanded={expandedRoles[role]}>
            {#each navItems.filter(item => belongsToRole(item, role)) as item}
              <li class="nav-item">
                <a class="nav-link" href={item.path} aria-label={translateText(item.labelKey)}>
                  {#if item.icon}
                    <span class="nav-icon">{item.icon}</span>
                  {/if}
                  {translateText(item.labelKey)}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    {/if}
  {/if}
</nav>


<style>
  .navigation {
    width: 100%;
  }

  /* Role Section */
  .role-section {
    margin-bottom: 15px;
  }

  /* Role Header */
  .role-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 10px;
    font-weight: bold;
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .role-header:hover {
    background-color: #e9ecef;
  }

  .role-title {
    font-size: 16px;
    color: #333;
  }

  .toggle-icon {
    font-size: 12px;
    color: #666;
  }

  /* Navigation List */
  .nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
    opacity: 0;
  }

  .nav-list.expanded {
    max-height: 500px; /* Adjust as needed */
    opacity: 1;
  }

  .nav-list.single-role {
    max-height: none;
    opacity: 1;
  }

  /* Navigation Item */
  .nav-item {
    margin-bottom: 5px;
  }

  /* Navigation Link */
  .nav-link {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    text-decoration: none;
    color: #333;
    border-radius: 4px;
    transition: background-color 0.2s;
    font-size: 14px;
  }

  .nav-link:hover {
    background-color: #e9ecef;
  }

  /* Active link styling (if applicable) */
  .nav-link.active {
    background-color: #007bff;
    color: #fff;
  }

  /* Navigation Icon */
  .nav-icon {
    margin-right: 8px;
    font-size: 16px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .role-header {
      font-size: 14px;
      padding: 8px;
    }

    .nav-link {
      font-size: 13px;
      padding: 6px 10px;
    }

    .nav-icon {
      font-size: 14px;
    }
  }
</style>
