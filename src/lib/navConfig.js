import { base } from '$app/paths'; // Import the base path
//import { t } from '$lib/i18n'; // Import the translation function

export const navItems = [

  {
    labelKey: 'coriHelpdesk',
    icon: '☎',
    // path: `https://corisystem.atlassian.net/servicedesk/customer/portal/1`,
    path: `${base}/helpdesk`,
    subject: 'Helpdesk',
    roles: ['provider','client','referrer','orgadmin','admin'], // Accessible only by admin
  },
  {
    labelKey: 'invites',
    icon: '☎',
    path: `${base}/invites`,
    subject: 'Manage Invites',
    roles: [ 'admin'], 
  },
  {
    labelKey: 'allComms',
    icon: '☎',
    path: `${base}/admin/communication`,
    subject: 'AllComms',
    roles: [ 'admin'], 
  },
  {
    labelKey: 'allCoriClients',
    icon: '⚙️',
    path: `${base}/clients/admin`,
    subject: 'Cori Clients',
    roles: ['admin'], // Accessible only by admin
  },

  {
    labelKey: 'staffAvailability',
    icon: '⚙️',
    path: `${base}/staff/orgadmin`,
    subject: 'Organization Staff',
    roles: ['orgadmin'], 
  },
  {
    labelKey: 'staffInformation',
    icon: '⚙️',
    path: `${base}/org/stafflist`,
    subject: 'Organization Staff List',
    roles: ['orgadmin'], // Accessible by orgadmin and admin roles
  },

  {
    labelKey: 'allCoriStaff',
    icon: '⚙️',
    path: `${base}/staff/admin`,
    subject: 'Cori Staff',
    roles: ['admin'], // Accessible only by admin
  },
  {
    labelKey: 'allCoriOrganizations',
    icon: '🛠️',
    path: `${base}/admin/organizations`,
    subject: 'Admin',
    roles: ['admin'], // Accessible only by admin

  },
  {
    labelKey: 'systemSettings',
    icon: '⚙️',
    path: `${base}/settings/admin`,
    subject: 'Admin Settings',
    roles: ['admin'], 

  },
  {
    labelKey: 'organizationSettings',
    icon: '⚙️',
    path: `${base}/settings/orgadmin`,
    subject: 'Org Settings',
    roles: ['orgadmin'], 

  },
  {
    labelKey: 'providerSettings',
    icon: '⚙️',
    path: `${base}/settings/provider`,
    subject: 'Provider Settings',
    roles: ['provider'],

  },
  {
    labelKey: 'clientSettings',
    icon: '⚙️',
    path: `${base}/settings/client`,
    subject: 'Client Settings',
    roles: ['client'], 

  },
  {
    labelKey: 'coriCode',
    icon: '⚙️',
    path: `${base}/coricode`,
    subject: 'Coricode',
    roles: ['admin'], 

  },
  {
    labelKey: 'coriPlans',
    icon: '⚙️',
    path: `${base}/coriplans`,
    subject: 'Cori Plans',
    roles: ['admin'], 

  },
  {
    labelKey: 'coriUI',
    icon: '⚙️',
    path: `${base}/coricode/pickui`,
    subject: 'Cori UI',
    roles: ['admin'], 

  },
  {
    labelKey: 'coriUItest',
    icon: '⚙️',
    path: `${base}/coricode/pickuitest`,
    subject: 'Cori UItest',
    roles: ['admin'], 

  },
  {
    labelKey: 'UITest',
    icon: '⚙️',
    path: `${base}/sandbox`,
    subject: 'Referral UItest',
    roles: ['admin'], 

  },

  {
    labelKey: 'searchForServices',
    icon: '🔍',
    path: `${base}/organizationsearch`,
    subject: 'Organization Search',
    roles: ['admin'],
  },
   {
    labelKey: 'Communication',
    icon: '🔔',
    path: `${base}/communication`,
    subject: 'Communication',
    roles: ['client','orgadmin', 'admin', 'provider'],

  },
  {
    labelKey: 'capacityAndAvailability',
    icon: '✉️',
    path: `${base}/capacity`,
    subject: 'Capacity',
    roles: ['provider', 'admin'], 
  },


];
