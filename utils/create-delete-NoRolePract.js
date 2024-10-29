import axios from 'axios';

const API_PRACTITIONER_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllPractitionerNamesAndIds';
const API_PRACTITIONER_ROLE_URL = 'https://elig.pro/avail/prod/api/role/PractitionerRole';
const API_ORG_NAME_URL = 'https://elig.pro/avail/prod/api/organization/getOrgName';
const API_DELETE_PRACT_URL = 'https://elig.pro/avail/prod/api/practitioner/delete';


// Fetch practitioner names and print only duplicates with their PractitionerRole IDs and Organization names
async function fetchAndPrintDuplicatesWithRolesAndOrgs() {
  try {
    const response = await axios.get(API_PRACTITIONER_URL);
    const practitioners = response.data;

    if (Array.isArray(practitioners)) {
      // Create a map to count occurrences of each name and store practitioner IDs
      const nameMap = new Map();

      // Count the occurrences of each name and store associated practitioner IDs
      practitioners.forEach(practitioner => {
        const { fullName, practitionerId } = practitioner;
        if (nameMap.has(fullName)) {
          nameMap.get(fullName).ids.push(practitionerId);
          nameMap.get(fullName).count += 1;  // Increment count for duplicates
        } else {
          nameMap.set(fullName, { count: 1, ids: [practitionerId] });
        }
      });

      // Process only duplicate names
      let duplicatesFound = false;
      for (const [name, data] of nameMap.entries()) {
        if (data.count > 1) {  // Only process duplicates
          duplicatesFound = true;
          console.log(`\nName: ${name}`);
          
          // For each duplicate practitioner ID, fetch the PractitionerRoles
          for (const practitionerId of data.ids) {
            console.log(`  Practitioner ID: ${practitionerId}`);
            const practitionerRoles = await fetchPractitionerRoles(practitionerId);
            
            if (practitionerRoles.length > 0) {
              for (const role of practitionerRoles) {
                const orgName = await fetchOrgName(role.organization?.reference);
                console.log(`    PractitionerRole ID: ${role.id}, Org Name: ${orgName}`);
              }
            } else {
              console.log('    No PractitionerRoles found.delete ', practitionerId) ;
             // const response = await axios.delete(`${API_DELETE_PRACT_URL}?id=${practitionerId}`);
             await axios.delete(`${API_DELETE_PRACT_URL}/${practitionerId}`);

              if (response.status === 200) {
                console.log(`    Successfully deleted Practitioner ID: ${practitionerId}`);
              } else {
                console.error(`    Failed to delete Practitioner ID: ${practitionerId}`);
              } 
            }
          }
        }
      }

      if (!duplicatesFound) {
        console.log('No duplicate names found.');
      }
    } else {
      console.error('Unexpected response format:', practitioners);
    }

  } catch (error) {
    console.error('Error fetching practitioner names:', error.message);
  }
}

// Fetch PractitionerRoles for a given practitionerId
async function fetchPractitionerRoles(practitionerId) {
  try {
    const practitionerReference = `Practitioner/${practitionerId}`;
    const response = await axios.get(`${API_PRACTITIONER_ROLE_URL}?practitioner=${practitionerReference}`);
    const practitionerRoles = response.data;

    if (Array.isArray(practitionerRoles.entry)) {
      return practitionerRoles.entry.map(entry => entry.resource);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching PractitionerRoles for practitioner ID ${practitionerId}:`, error.message);
    return [];
  }
}

// Fetch Organization Name based on the OrgId (reference)
async function fetchOrgName(orgReference) {
  if (!orgReference) {
    return 'Unknown Org1';
  }
  try {
    const response = await axios.get(`${API_ORG_NAME_URL}?reference=${orgReference}`);
    const orgData = response.data;
   // console.log ("dupPract orgData",JSON.stringify(orgData));
    return orgData ;
  } catch (error) {
    console.error(`Error fetching Org Name for reference ${orgReference}:`, error.message);
    return 'Unknown Org3';
  }
}

// Execute the script
fetchAndPrintDuplicatesWithRolesAndOrgs();
