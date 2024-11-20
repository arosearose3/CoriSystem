import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

const API_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllIds';


async function fetchPractitionerIds() {
  try {
    const response = await axios.get(API_URL);
    const practitionerIds = response.data;

    if (Array.isArray(practitionerIds)) {
      console.log('List of Practitioner IDs:');
      practitionerIds.forEach((id, index) => {
        console.log(`${index + 1}: ${id}`);
      });
    } else {
      console.error('Unexpected response format:', practitionerIds);
    }

  } catch (error) {
    console.error('Error fetching practitioner IDs:', error.message);
  }
}

fetchPractitionerIds();
