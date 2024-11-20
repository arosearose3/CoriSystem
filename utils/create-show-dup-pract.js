import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

const API_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllPractitionerNamesAndIds';


// Fetch practitioner names and print only duplicate names along with practitioner IDs
async function fetchAndPrintDuplicateNames() {
    try {
      const response = await axios.get(API_URL);
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
  
        // Filter and print only duplicate names
        console.log('Duplicate Practitioner Names and IDs:');
        let duplicatesFound = false;
        nameMap.forEach((data, name) => {
          if (data.count > 1) {  // Only print if the name appears more than once
            duplicatesFound = true;
            console.log(`Name: ${name}`);
            data.ids.forEach(id => console.log(`  Practitioner ID: ${id}`));
          }
        });
  
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
  
  fetchAndPrintDuplicateNames();