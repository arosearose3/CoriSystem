import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import nodemailer from 'nodemailer';
import xlsx from 'xlsx';
import path from 'path';
import csv from 'csv-parser'; 


import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const router = express.Router();
const metadataFilePath = path.join(__dirname, './exclusionUploadFileData.json');

// In-memory storage for file data
let staffData = [];
let samData = [];
let oigData = [];
let coData = [];

// Helper function to load JSON metadata
const loadMetadata = () => {
  if (!fs.existsSync(metadataFilePath)) {
    return {};
  }
  try {
    let r = JSON.parse(fs.readFileSync(metadataFilePath, 'utf-8'));
  //  console.log("load metadata exclusion:", r);
    return r;
  } catch (error) {
    console.error("Error parsing JSON from metadata file:", error);
    return {};
  }
};

const parseSAMCSV = (filePath) => {
 // console.log ("parseSAM path:",filePath);
  return new Promise((resolve, reject) => {
    const results = [];
    let isFirstRow = true; // Flag to skip the header row
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (isFirstRow) {
          isFirstRow = false; // Skip the header row
        } else {
          const firstName = data["First"] || 'Unknown';
          const lastName = data["Last"] || 'Unknown';

       //   console.log("SAM CSV f,l", firstName, lastName);
          results.push({
            firstName,
            lastName,
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};



const parseColoradoXLSX = (filePath) => {
//  console.log ("parseCO path:",filePath);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }); // Use header: 1 to get rows as arrays
  
  const results = [];

  // Start from the second row (skip the header)
  data.slice(1).forEach(row => {
    const providerName = row[0]; // ProviderName is in column 1
    const npi = row[2]; // NPI is in column 3

    // Split the name into components
    const nameParts = providerName.split(/[,\s]+/).filter(Boolean);
    
    // Assume the first part could be first or last name depending on the format
    let firstName = 'Unknown';
    let lastName = 'Unknown';

    // Logic to handle both "LastName, FirstName" and "FirstName LastName"
    if (nameParts.length >= 2) {
      if (providerName.includes(',')) {
        // Format: LastName, FirstName
        lastName = nameParts[0];
        firstName = nameParts[1];
      } else {
        // Format: FirstName LastName
        firstName = nameParts[0];
        lastName = nameParts[1];
      }
    }
  //  console.log("Colorado CSV f,l", firstName, lastName);
    results.push({
      firstName,
      lastName,
      npi: npi || 'Unknown'
    });
  });

  return results;
};


// return array with uploaded at date/times
router.get('/upload-dates', (req, res) => {
  try {
    const metadata = loadMetadata();
    const response = {
      OIG: metadata.oig?.uploadedAt || 'No upload date available',
      SAMHSA: metadata.sam?.uploadedAt || 'No upload date available',
      Colorado: metadata.co?.uploadedAt || 'No upload date available'
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load upload dates' });
  }
});

const parseOIGCSV = (filePath) => {
 // console.log("parseOIG path:", filePath);
  return new Promise((resolve, reject) => {
    const results = [];
    let isFirstRow = true; // Flag to skip the header row
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (isFirstRow) {
          isFirstRow = false; // Skip the header row
        } else {
          const lastName = data["LASTNAME"] || 'Unknown';
          const firstName = data["FIRSTNAME"] || 'Unknown';
          const npi = data["NPI"] || 'Unknown';
          const dob = data["DOB"] ? formatDOB(data["DOB"]) : 'Unknown';

         // console.log("OIG CSV f,l,npi,dob", firstName, lastName, npi, dob);
          results.push({
            firstName,
            lastName,
            npi,
            dob
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', (error) => {
        console.error("CSV Parsing Error: ", error); // Log the error
        reject(error); // Reject the promise if there's an error
      });
  });
};

// Function to format DOB from 'YYYYMMDD' to 'YYYY-MM-DD'
const formatDOB = (dob) => {
  if (dob.length === 8) {
    return `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6)}`;
  }
  return 'Unknown';
};

// Endpoint to load and process exclusion lists based on JSON metadata
// expects [
// ["John", "Doe", "1980-01-01", "1234567890"],
//  ["Jane", "Smith", "1985-05-05", "0987654321"]
// ]
/*   returns this object style to the client
  {
    "name": "Jane Smith",
    "samMatch": false,
    "oigMatch": true,
    "coMatch": false
  },
  {
    "name": "Alice Johnson",
    "samMatch": false,
    "oigMatch": false,
    "coMatch": true
  }
]
*/
router.post('/check', async (req, res) => {
  try {
    const metadata = loadMetadata();
    const uploadDir = path.join(__dirname, '/../uploads'); // Assuming all files are in uploads directory


    // Load exclusion data from saved files if they exist
    if (metadata.sam && fs.existsSync(path.join(uploadDir, metadata.sam.fileName))) {
      samData = await parseSAMCSV(path.join(uploadDir, metadata.sam.fileName));
    }
    if (metadata.oig && fs.existsSync(path.join(uploadDir, metadata.oig.fileName))) {
      oigData = await parseOIGCSV(path.join(uploadDir, metadata.oig.fileName))
    }
    if (metadata.co && fs.existsSync(path.join(uploadDir, metadata.co.fileName))) {
      coData = parseColoradoXLSX(path.join(uploadDir, metadata.co.fileName));
    }

    // Expect practitioner data to be sent in the request body
    const { staffData } = req.body; // Assuming staffData is passed in the request body

    if (!staffData || !Array.isArray(staffData)) {
      return res.status(400).json({ error: 'Invalid or missing practitioner data' });
    }

    const results = staffData.map(staff => {
      const [firstName, lastName, dob, npi] = staff;
   

      const samMatch = samData.some(sam => 
        sam.firstName.toLowerCase() === firstName.toLowerCase() && 
        sam.lastName.toLowerCase() === lastName.toLowerCase()
      );

      const oigMatch = oigData.some(oig => 
        oig.firstName.toLowerCase() === firstName.toLowerCase() && 
        oig.lastName.toLowerCase() === lastName.toLowerCase() &&
        oig.npi === npi && 
        oig.dob === dob // Ensure DOB is in 'YYYY-MM-DD' format for matching
      );

      const coMatch = coData.some(co => {
        // Compare as First Name / Last Name
  /*       if (firstName==="Walton" || lastName==="Walton") {
          console.log ("staff Walton found:", co.firstName,co.lastName);

        } */
        const firstLastMatch = 
            (co.firstName.toLowerCase() === firstName.toLowerCase() && 
             co.lastName.toLowerCase() === lastName.toLowerCase());
        
        // Compare as Last Name / First Name (swapped)
        const lastFirstMatch = 
            (co.firstName.toLowerCase() === lastName.toLowerCase() && 
             co.lastName.toLowerCase() === firstName.toLowerCase());
    
        // Return true if either order matches AND NPI matches
        return (firstLastMatch || lastFirstMatch) || co.npi === npi;
    });

     // console.log ("match names:",firstName, lastName);
      return {
        name: `${firstName} ${lastName}`,
        samMatch,
        oigMatch,
        coMatch
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
