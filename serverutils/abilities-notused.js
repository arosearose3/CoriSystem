// abilities.js
import { AbilityBuilder, Ability } from '@casl/ability';

// Define abilities based on user roles
export function defineAbilitiesFor(user) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  switch (user.role) {
    case 'admin':
      // Admin can manage everything in the system
      can('manage', 'all'); // Full access to all resources
      break;

    case 'orgadmin':
      // Organizational admin can manage users, permissions, and settings within their organization
      can('manage', 'users'); // Manage users within the organization
      can('update', 'settings'); // Update organization settings
      can('view', 'referrals'); // View all referrals in their organization
      break;

    case 'coordinator':
      // Coordinator can manage referrals, including making new referrals
      can('view', 'referrals'); // View referrals
      can('create', 'referrals'); // Create new referrals
      can('edit', 'referrals'); // Edit existing referrals
      can('assign', 'referrals'); // Assign referrals to providers
      break;

    case 'provider':
      // Provider can view and deliver services related to referrals
      can('view', 'referrals'); // View referrals
      can('update', 'services'); // Update services delivered to clients
      can('edit', 'referrals', { ownerId: user.id }); // Can only edit referrals that belong to them
      break;

    case 'referrer':
      // Referrer can create and view their own referrals
      can('create', 'referrals'); // Create new referrals
      can('view', 'referrals', { ownerId: user.id }); // View only their own referrals
      break;

    case 'client':
      // Client can only view their own data and related services
      can('view', 'own_data'); // View their own data
      can('view', 'services', { clientId: user.id }); // View services related to them
      break;

    case 'publichealth':
      // Public health professionals can view data relevant to community health outcomes
      can('view', 'community_health_data'); // Access data related to public health
      can('view', 'referrals', { community: true }); // View referrals relevant to public health tracking
      break;

    default:
      // Default role with no specific permissions
      cannot('manage', 'all');
      break;
  }

  return build();
}

