
//
// October 11 2024. DO NOT RUN THIS AGAIN.  The organizations are imported. 
//


import axios from 'axios';
import clinics from './clinics.json' assert { type: 'json' };

const BASE_URL = 'https://elig.pro/avail/prod/api/organization/';

async function createOrganizations() {
  for (const clinic of clinics) {
    const organizationData = {
      resourceType: 'Organization',
      name: clinic.name,
      telecom: [
        {
          system: 'email',
          value: clinic.email
        }
      ],
      active: true
    };

    try {
      const response = await axios.post(`${BASE_URL}/add`, organizationData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log(`Created organization: ${clinic.name}`);
      console.log('Response:', response.data);
    } catch (error) {
      console.error(`Failed to create organization ${clinic.name}:`, error.response ? error.response.data : error.message);
    }
  }
}

createOrganizations().then(() => console.log('Finished creating organizations'));