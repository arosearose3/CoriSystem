import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

const BASE_URL = 'https://elig.pro/avail/prod/api';
const CSV_FILE_PATH = './CombineOct.csv'; // Update this with your CSV file path
const DEFAULT_DOB = '1981-01-01';
const DEFAULT_NPI = '9999999999';

const organizationsData = [
    {
      "name": "Family Center Counseling Services",
      "id": "c6bcdc21-0df5-4e8b-a7e4-1fb437fbdf15",
      "email": "familycentercs@gmail.com"
    },
    {
      "name": "Zia Healing Wellness",
      "id": "1b6095d3-1a37-4b4b-ad18-1590c8b972f1",
      "email": "admin@ziahealingwellness.com"
    },
    {
      "name": "Mirador Counseling",
      "id": "420a2b80-de9b-4ed3-8ad7-27c80a502aca",
      "email": "info@miradorcounseling.com"
    },
    {
      "name": "Blue Channel Therapy",
      "id": "c258ccfe-5d22-4d54-9b3a-bdf93ba7bf6b",
      "email": "bluechanneltherapy@gmail.com"
    },
    {
      "name": "Ignite Counseling Colorado",
      "id": "99be5a3d-202a-4256-8cd5-c40dcda60abb",
      "email": "carla@ignitecounselingcolorado.com"
    },
    {
      "name": "Alis Behavioral Health",
      "id": "ac9de1ba-721d-47c5-b6b6-81e2e5c089cc",
      "email": "Christine@Alisbh.com"
    },
    {
      "name": "Las Lobas del Corazon",
      "id": "3c396920-a7ab-48d8-8cea-ca6725ea3415",
      "email": "hello@laslobasdelcorazon.com"
    },
    {
      "name": "Higher Sights Counseling",
      "id": "b28424d0-92b3-48a3-b0b8-89ca3119e05e",
      "email": "Lindsay@HigherSightsCounseling.com"
    },
    {
      "name": "Raft Counseling",
      "id": "d88d436f-55e2-44d5-b733-c1b6498da86a",
      "email": "Amanda@raftcounseling.com"
    },
    {
      "name": "C4VL",
      "id": "65a87424-80cd-4597-a1df-1685b8f7ded0",
      "email": "admin@c4vl.com"
    },
    {
      "name": "Mindful Resolve Counseling",
      "id": "6b37b3a0-e7d3-488b-a71a-7d6601251f25",
      "email": "mindfulresolvecounseling@gmail.com"
    },
    {
      "name": "Early Childhood Wellness Place",
      "id": "f04423d3-3cff-4f9f-9bfe-e1760084e67b",
      "email": "info@earlychildhoodwellnessplace.com"
    },
    {
      "name": "Mountain Vista Psychology",
      "id": "9544775c-7710-4493-b731-238492c9870b",
      "email": "tmcconnell@mountainvistapsychology.com"
    },
    {
      "name": "Neurobloom Colorado",
      "id": "b5d04220-1470-4ae1-b4ed-e989e01a81ea",
      "email": "tanja@neurobloomcolorado.com"
    },
    {
      "name": "Revival Therapy Services",
      "id": "0eb9c908-b0fb-493b-b215-fe385d7184d1",
      "email": "kmaguire@revivaltherapyservices.com"
    },
    {
      "name": "Aspen Therapy Collective",
      "id": "08e843ed-d2ce-485b-a1d9-79a22150348a",
      "email": "alyssa@aspentherapycollective.org"
    },
    {
      "name": "Boulder Emotional Wellness",
      "id": "533c1e68-6931-423c-8636-1bb057db7d9c",
      "email": "andrewroselpc@boulderemotionalwellness.org"
    },
    {
      "name": "Roots to Ground",
      "id": "533c1e68-6931-423c-8636-1bb057db7d9c",
      "email": "rootstoground@gmail.com"
    },
    {
      "name": "GJ Counseling",
      "id": "39b26750-bd24-43f2-9e7a-587a452f6d2d",
      "email": "griffin@gjcounseling.com"
    },
    {
      "name": "Child Family Therapy of Denver",
      "id": "467eb5c1-4561-41d5-badb-e7184cdc8b50",
      "email": "kbianucci@childfamilytherapyofdenver.com"
    },
    {
      "name": "Denver Counseling",
      "id": "ba36ee3b-75da-4e21-9e6b-c95f9fe74721",
      "email": "amanda@denvercounseling.com"
    },
    {
      "name": "Restore Counseling",
      "id": "57cc3447-b3d0-4e44-b471-5ea3365d0b53",
      "email": "info@restorecounselingllc.com"
    },
    {
      "name": "Mindful Alpha",
      "id": "325c63bf-cc82-417b-958a-de39ff6edad1",
      "email": "mindful.alpha@gmail.com"
    },
    {
      "name": "Adaptive Therapy Solutions",
      "id": "41a0bab5-f3d9-48f1-b697-56daf19677e6",
      "email": "rhelms@adaptivetherapysolutions.com"
    },
    {
      "name": "Perla Duran Counseling",
      "id": "49e77733-2a29-4ada-9ab1-6c3432f2b203",
      "email": "perla@perladuran.com"
    },
    {
      "name": "Integrated Wellness",
      "id": "57a447ee-3eb3-4624-a304-5faa2caba357",
      "email": "Awright@integratedwellnessfc.com"
    },
    {
      "name": "CRS Counseling",
      "id": "0cedbf57-6f69-4168-a645-ddb1cff51554",
      "email": "allison@crscounseling.com"
    },
    {
      "name": "Silver Linings Mental Health",
      "id": "65516bda-f4a9-48ad-af8a-6a3bd1f0d2a0",
      "email": "admin@silverliningsmh.com"
    },
    {
      "name": "Center for Secure Attachment",
      "id": "fc39642c-2387-4775-b480-cc8aa75d1c7b",
      "email": "admin@centerforsecureattachment.com"
    },
    {
      "name": "Swinton Counseling Group",
      "id": "db591bd4-ecef-4028-871b-7bd808ef5746",
      "email": "trisha@swintoncounselinggroup.com"
    },
    {
      "name": "Better Life Colorado",
      "id": "f3533ea1-3016-49e3-8c88-7911fd4de899",
      "email": "sberliant@betterlifecolorado.com"
    },
    {
      "name": "Denver Affordable Counseling",
      "id": "bbba02e4-68ce-43ff-85e9-6381cc2cb702",
      "email": "admin@denveraffordablecounseling.com"
    }
  ];

 
function parseDOB(dobString) {
    if (!dobString) {
      console.warn(`Warning: Missing DOB. Using default DOB: ${DEFAULT_DOB}`);
      return DEFAULT_DOB;
    }
    try {
      if (dobString.includes('/')) {
        const [month, day, year] = dobString.split('/');
        return `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (dobString.length === 8) {
        return `${dobString.substr(0, 4)}-${dobString.substr(4, 2)}-${dobString.substr(6, 2)}`;
      } else {
        throw new Error('Invalid DOB format');
      }
    } catch (error) {
      console.warn(`Warning: Invalid DOB format (${dobString}). Using default DOB: ${DEFAULT_DOB}`);
      return DEFAULT_DOB;
    }
  }
  
  function validateNPI(npi) {
    if (!npi) {
      console.warn(`Warning: Missing NPI. Using default NPI: ${DEFAULT_NPI}`);
      return DEFAULT_NPI;
    }
    const cleanNPI = npi.replace(/\D/g, '');
    if (cleanNPI.length === 10) {
      return cleanNPI;
    } else {
      console.warn(`Warning: Invalid NPI format (${npi}). Using default NPI: ${DEFAULT_NPI}`);
      return DEFAULT_NPI;
    }
  }
  
  async function createPractitioner(practitionerData) {
    console.log ("in CreatePract:"+JSON.stringify(practitionerData));
    try {
      const dob = parseDOB(practitionerData.dob);
      const npi = validateNPI(practitionerData.npi);
      console.log ("in createPrac:", dob, npi);
  
      const response = await axios.post(`${BASE_URL}/practitioner/add`, {
        resourceType: 'Practitioner',
        name: [{
          use: 'official',
          family: practitionerData.lastName || 'Unknown',
          given: [practitionerData.firstName || 'Unknown']
        }],
        birthDate: dob,
        identifier: [{
          system: 'http://hl7.org/fhir/sid/us-npi',
          value: npi
        }]
      });

      console.log ("in create, response.data:"+JSON.stringify(response.data));
      return response.data.practitionerID;
    } catch (error) {
      console.error('Error creating practitioner:', error.response ? error.response.data : error.message);
      return null;
    }
  }
  
  async function createPractitionerRole(practitionerId, organizationId) {
    try {
      const response = await axios.post(`${BASE_URL}/role/create`, {
        practitionerId,
        organizationId
      });
      console.log ("in createPR, response.data:"+JSON.stringify(response.data));
      return response.data.practitionerRoleID;
    } catch (error) {
      console.error('Error creating practitioner role:', error.response ? error.response.data : error.message);
      return null;
    }
  }
  
  async function patchRoles(practitionerId, organizationId) {
    try {
      const response = await axios.patch(`${BASE_URL}/role/patchRoles`, {
        practitioner: { reference: `Practitioner/${practitionerId}` },
        organization: { reference: `Organization/${organizationId}` },
        roles: ['provider']
      });
      return response.data.data.id;
    } catch (error) {
      console.error('Error patching roles:', error.response ? error.response.data : error.message);
      return null;
    }
  }
  
  async function processRow(row) {
    console.log('Processing row:', row);  // Log the raw row data
    
    let firstName= row['fname'];
    let lastName=  row['lname'] ;
    let dob= row['dob'];
    let  npi= row['npi'];

    console.log ("row data", firstName, lastName,dob, npi);

 
    
    const practitionerId = await createPractitioner({
      firstName: firstName,
      lastName: lastName,
      dob: dob,
      npi: npi
    });
  
    if (practitionerId) {
      console.log(`Created Practitioner: ${practitionerId}`);
      const organization = organizationsData.find(org => org.email === (row['Email'] || row['email']));
      if (organization) {
        const roleId = await createPractitionerRole(practitionerId, organization.id);
        if (roleId) {
          console.log(`Created PractitionerRole ${roleId} linking Practitioner ${practitionerId} to Organization ${organization.id}`);
          
          const patchedRoleId = await patchRoles(practitionerId, organization.id);
          if (patchedRoleId) {
            console.log(`Patched roles for PractitionerRole ${patchedRoleId}`);
          } else {
            console.error(`Failed to patch roles for Practitioner ${practitionerId}`);
          }
        } else {
          console.error(`Failed to create PractitionerRole for Practitioner ${practitionerId}`);
        }
      } else {
        console.log(`No matching organization found for email: ${row['Email'] || row['email']}`);
      }
    } else {
      console.error(`Failed to create Practitioner for ${row['First Name'] || row['firstName'] || row['FirstName']} ${row['Last Name'] || row['lastName'] || row['LastName']}`);
    }
  }
  
  async function processCsvFile() {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(
          csv({
            headers: ['fname', 'lname', 'dob', 'npi', 'email'], // Define expected headers
            skipEmptyLines: true, // Skip empty lines if needed
            trim: true, // Trim whitespace from headers and fields
            mapHeaders: ({ header, index }) => (index < 5 ? header : null), // Ignore extra columns
          })
        )
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log('CSV Headers:', Object.keys(results[0])); // Log the CSV headers
          for (const row of results) {
            await processRow(row);
          }
          console.log('Finished processing CSV file');
          resolve();
        })
        .on('error', reject);
    });
  }

  processCsvFile().then(() => console.log('Script completed')).catch(console.error);