import { base } from '$app/paths'; // Import the base path

export const navItems = [
/*   {
    label: 'Clients',
    icon: '⚙️',
    path: `${base}/clients/provider`,
    subject: 'Provider Clients',
    roles: ['provider'], // Accessible by provider 
  }, */
/*   {
    label: 'Organization Clients',
    icon: '⚙️',
    path: `${base}/clients/orgadmin`,
    subject: 'Organization Clients',
    roles: ['orgadmin'], // Accessible by orgadmin and admin roles
  }, */
  {
    label: 'Cori Helpdesk',
    icon: '☎',
    // path: `https://corisystem.atlassian.net/servicedesk/customer/portal/1`,
    path: `${base}/helpdesk`,
    subject: 'Helpdesk',
    roles: ['provider','client','referrer','orgadmin','admin'], // Accessible only by admin
  },
  {
    label: 'All Cori Clients',
    icon: '⚙️',
    path: `${base}/clients/admin`,
    subject: 'Cori Clients',
    roles: ['admin'], // Accessible only by admin
  },
/*   {
    label: 'Clients',
    icon: '⚙️',
    path: `${base}/client`,
    subject: 'Organization Clients',
    roles: ['orgadmin'], 
  }, */
  {
    label: 'Staff Availability',
    icon: '⚙️',
    path: `${base}/staff/orgadmin`,
    subject: 'Organization Staff',
    roles: ['orgadmin'], 
  },
  {
    label: 'Staff Information',
    icon: '⚙️',
    path: `${base}/org/stafflist`,
    subject: 'Organization Staff List',
    roles: ['orgadmin'], // Accessible by orgadmin and admin roles
  },

  {
    label: 'All Cori Staff',
    icon: '⚙️',
    path: `${base}/staff/admin`,
    subject: 'Cori Staff',
    roles: ['admin'], // Accessible only by admin
  },
  {
    label: 'All Cori Organizations',
    icon: '🛠️',
    path: `${base}/admin/organizations`,
    subject: 'Admin',
    roles: ['admin'], // Accessible only by admin

  },
  {
    label: 'System Settings',
    icon: '⚙️',
    path: `${base}/settings/admin`,
    subject: 'Admin Settings',
    roles: ['admin'], 

  },
  {
    label: 'Organization Settings',
    icon: '⚙️',
    path: `${base}/settings/orgadmin`,
    subject: 'Org Settings',
    roles: ['orgadmin'], 

  },
  {
    label: 'Provider Settings',
    icon: '⚙️',
    path: `${base}/settings/provider`,
    subject: 'Provider Settings',
    roles: ['provider'],

  },
  {
    label: 'Client Settings',
    icon: '⚙️',
    path: `${base}/settings/client`,
    subject: 'Client Settings',
    roles: ['client'], 

  },
  
/*   {
    label: 'Consents',
    icon: '✅',
    path: `${base}/consents`,
    subject: 'Consents',
    roles: ['client', 'provider', 'orgadmin','admin'],

  }, */
  {
    label: 'Search for Services',
    icon: '🔍',
    path: `${base}/organizationsearch`,
    subject: 'Organization Search',
    roles: ['admin'],
  },
/*   {
    label: 'Notifications',
    icon: '🔔',
    path: `${base}/notifications`,
    subject: 'Notifications',
    roles: ['client','orgadmin', 'admin', 'provider'],

  },
  {
    label: 'Messages',
    icon: '✉️',
    path: `${base}/messages`,
    subject: 'Messages',
    roles: ['client', 'provider','orgadmin', 'admin'],
  }, */
  {
    label: 'Capacity and Availability',
    icon: '✉️',
    path: `${base}/capacity`,
    subject: 'Capacity',
    roles: ['provider', 'admin'], // Accessible by provider and admin roles
  },

/*   {
    label: 'Referrals',
    icon: '📄',
    path: `${base}/referrals`,
    subject: 'Referrals',
    roles: ['client', 'provider','org admin', 'admin'],

  }, */

];
