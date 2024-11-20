import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import csv from 'csv-parser';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary

const base = BASE_PATH;
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// In-memory storage for parsed data
let practitionerData = [];

// Helper function to parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Endpoint for file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    practitionerData = await parseCSV(req.file.path);
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ message: 'File uploaded and processed successfully', count: practitionerData.length });
  } catch (error) {
    console.error('Error in file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for creating Practitioners
router.post('/create-practitioners', async (req, res) => {
  try {
    if (practitionerData.length === 0) {
      return res.status(400).json({ error: 'No data available. Please upload a file first.' });
    }

    const createdPractitioners = [];

    for (const row of practitionerData) {
      const practitioner = {
        resourceType: "Practitioner",
        id: uuidv4(),
        name: [
          {
            use: "official",
            family: row.familyName,
            given: [row.givenName]
          }
        ],
        telecom: [
          {
            system: "email",
            value: row.email
          }
        ],
        birthDate: row.birthDate,
        identifier: [
          {
            system: "http://hl7.org/fhir/sid/us-npi",
            value: row.npi
          }
        ]
      };

      // Here you would typically save the practitioner to your database
      // For this example, we're just adding it to an array
      createdPractitioners.push(practitioner);

      // You could also make a call to your FHIR server here
      // For example:
      // await fetch(`${base}/api/practitioner/add`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(practitioner),
      // });
    }

    res.json({ 
      message: 'Practitioners created successfully', 
      count: createdPractitioners.length,
      practitioners: createdPractitioners 
    });

  } catch (error) {
    console.error('Error in creating practitioners:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;