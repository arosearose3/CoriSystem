import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';

const API_URL = 'https://elig.pro/avail/prod/api/practitioner/getAllIds';



// Function to generate a random 9-character string (lowercase letters and numbers)
function generateRandomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Fetch practitioner IDs and generate random codes
async function generateUserCodes() {
  try {
    const response = await axios.get(API_URL);
    const practitionerIds = response.data;

    if (Array.isArray(practitionerIds)) {
      const userCodes = practitionerIds.map((id) => ({
        code: generateRandomCode(),
        practitionerId: id,
      }));

      // Convert the array to a module-exportable format for `userCodes.js`
      const fileContent = `export const UserCodes = ${JSON.stringify(userCodes, null, 2)};`;

      // Write to userCodes.js
      fs.writeFileSync('userCodes.js', fileContent);

      console.log('User codes generated and saved to userCodes.js');
    } else {
      console.error('Unexpected response format:', practitionerIds);
    }

  } catch (error) {
    console.error('Error fetching practitioner IDs:', error.message);
  }
}

generateUserCodes();
