import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

const API_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllPractitionerNamesAndIds';

const API_DELETE_PRACT_URL = 'https://elig.pro/avail/prod/api/practitioner/delete';

async function deletePractitionerIfNameContainsDigit(practitioner) {
  if (/\d/.test(practitioner.fullName)) {
    try {
      let response = await axios.delete(`${API_DELETE_PRACT_URL}/${practitioner.practitionerId}`);
      console.log(`Successfully deleted practitioner ID: ${practitioner.practitionerId}`);
    } catch (error) {
      console.error(`Failed to delete practitioner ID: ${practitioner.practitionerId}`, error.message);
    }
  }
}

// Fetch practitioner names and log them to the console
async function fetchPractitionerNames() {
  try {
    const response = await axios.get(API_URL);
    const practitioners = response.data;

    if (Array.isArray(practitioners)) {
      console.log('List of Practitioner Names:');
      practitioners.forEach(practitioner => {
        console.log(`Name: ${practitioner.fullName}`);
        if (/\d/.test(practitioner.fullName)) {
          console.log(`delete Name: ${practitioner.fullName}`);
           deletePractitionerIfNameContainsDigit(practitioner);
        }
      });
    } else {
      console.error('Unexpected response format:', practitioners);
    }

  } catch (error) {
    console.error('Error fetching practitioner names:', error.message);
  }
}

fetchPractitionerNames();
