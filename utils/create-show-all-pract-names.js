import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

const API_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllPractitionerNamesAndIds';


// Fetch practitioner names and log them to the console
async function fetchPractitionerNames() {
  try {
    const response = await axios.get(API_URL);
    const practitioners = response.data;

    if (Array.isArray(practitioners)) {
      console.log('List of Practitioner Names:');
      practitioners.forEach(practitioner => {
        console.log(`Name: ${practitioner.fullName}`);
      });
    } else {
      console.error('Unexpected response format:', practitioners);
    }

  } catch (error) {
    console.error('Error fetching practitioner names:', error.message);
  }
}

fetchPractitionerNames();
