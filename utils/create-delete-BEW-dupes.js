import axios from 'axios';

const API_PRACTITIONER_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllPractitionerNamesAndIds';
const API_PRACTITIONER_ROLE_URL = 'https://elig.pro/avail/prod/api/role/PractitionerRole';
const API_ORG_NAME_URL = 'https://elig.pro/avail/prod/api/organization/getOrgName';
const API_DELETE_ROLE_URL = 'https://elig.pro/avail/prod/api/role/delete';
const BOULDER_EMOTIONAL_WELLNESS = 'Boulder Emotional Wellness';

const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds
});

async function fetchAndProcessPractitioners() {
  try {
    console.log('Fetching practitioners...');
    const response = await axiosInstance.get(API_PRACTITIONER_URL);
    const practitioners = response.data;

    if (Array.isArray(practitioners)) {
      const practitionerMap = new Map();

      // Group practitioners by name
      practitioners.forEach(practitioner => {
        const { fullName, practitionerId } = practitioner;
        if (practitionerMap.has(fullName)) {
          practitionerMap.get(fullName).push(practitionerId);
        } else {
          practitionerMap.set(fullName, [practitionerId]);
        }
      });

      // Process practitioners with duplicate names
      for (const [name, ids] of practitionerMap.entries()) {
        if (ids.length > 1) {
          console.log(`Processing duplicate name: ${name}`);
          await processPractitionersByName(name, ids);
        }
      }
    } else {
      console.error('Unexpected response format:', practitioners);
    }
  } catch (error) {
    console.error('Error fetching practitioners:', error.message || error);
  }
}

async function processPractitionersByName(name, practitionerIds) {
  let allRoles = [];

  // Fetch all roles for practitioners with the same name
  for (const practitionerId of practitionerIds) {
    const roles = await fetchPractitionerRoles(practitionerId);
    allRoles = allRoles.concat(roles);
  }

  console.log(`Found ${allRoles.length} total roles for practitioners named "${name}"`);

  let hasBoulderEmotionalWellness = false;

  // First pass: Check if there's a BEW role
  for (const role of allRoles) {
    const orgName = await fetchOrgName(role.organization?.reference);
    if (orgName === BOULDER_EMOTIONAL_WELLNESS) {
      hasBoulderEmotionalWellness = true;
      console.log(`  Found BEW PractitionerRole with ID: ${role.id} for "${name}"`);
      break; // Exit the loop once BEW role is found
    }
  }

  // Second pass: Delete non-BEW roles if a BEW role was found
  if (hasBoulderEmotionalWellness) {
    for (const role of allRoles) {
      const orgName = await fetchOrgName(role.organization?.reference);
      if (orgName !== BOULDER_EMOTIONAL_WELLNESS) {
        await deletePractitionerRole(role.id);
      }
    }
  } else {
    console.log(`  No BEW role found for practitioners named "${name}"`);
  }
}

async function fetchPractitionerRoles(practitionerId) {
  try {
    const practitionerReference = `Practitioner/${practitionerId}`;
    const response = await axiosInstance.get(`${API_PRACTITIONER_ROLE_URL}?practitioner=${practitionerReference}`);
    const practitionerRoles = response.data;

    if (Array.isArray(practitionerRoles.entry)) {
      return practitionerRoles.entry.map(entry => entry.resource);
    }

    console.log(`  No roles found for practitioner: ${practitionerId}`);
    return [];
  } catch (error) {
    console.error(`Error fetching PractitionerRoles for practitioner ID ${practitionerId}:`, error.message || error);
    return [];
  }
}

async function fetchOrgName(orgReference) {
  if (!orgReference) {
    return 'Unknown Org';
  }
  try {
    const response = await axiosInstance.get(`${API_ORG_NAME_URL}?reference=${orgReference}`);
    return response.data; // Expecting the org name as a string
  } catch (error) {
    console.error(`Error fetching Org Name for reference ${orgReference}:`, error.message || error);
    return 'Unknown Org';
  }
}

async function deletePractitionerRole(practitionerRoleId) {
  try {
    console.log("Attempting to delete PractitionerRole with ID:", practitionerRoleId);
/*     const response = await axiosInstance.delete(`${API_DELETE_ROLE_URL}?practitionerRoleId=${practitionerRoleId}`);
    if (response.status === 200) {
      console.log(`    Successfully deleted PractitionerRole ID: ${practitionerRoleId}`);
    } else {
      console.error(`    Failed to delete PractitionerRole ID: ${practitionerRoleId}`);
    } */
  } catch (error) {
    console.error(`Error deleting PractitionerRole ID ${practitionerRoleId}:`, error.message || error);
  }
}

fetchAndProcessPractitioners();