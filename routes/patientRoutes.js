import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import axios from 'axios'; 
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary


const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

// Update generalPractitioner
router.post('/update', async (req, res) => {
  const { id, generalPractitioner } = req.body;

  if (!id || !generalPractitioner) {
    return res.status(400).json({ error: 'Patient ID and generalPractitioner are required.' });
  }

  try {
    const patientUrl = `${FHIR_BASE_URL}/Patient/${id}`;
    const accessToken = await getFhirAccessToken();

    // Fetch the existing patient resource
    const response = await axios.get(patientUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const patient = await handleBlobResponse(response.data);

    if (patient.resourceType !== 'Patient') {
      return res.status(400).json({ error: 'Resource fetched is not of type Patient.' });
    }

    // Update the generalPractitioner field
    patient.generalPractitioner = generalPractitioner;

    // Send the updated patient resource back to the FHIR store
    const updateResponse = await axios.put(patientUrl, patient, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json'
      }
    });

    res.json({ message: 'Patient updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating patient:', error.message);
    res.status(500).json({ error: 'Failed to update patient', details: error.message });
  }
});

// Get Practitioner's Patients
router.get('/getPractitionersPatients', async (req, res) => {
  const { practitionerId } = req.query;

  if (!practitionerId) {
    return res.status(400).json({ error: 'Practitioner ID is required.' });
  }

  try {
    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/Patient?general-practitioner=${practitionerId}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const patients = await handleBlobResponse(response.data);
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error.message);
    res.status(500).json({ error: 'Failed to fetch patients', details: error.message });
  }
});

// Add a new Patient
router.post('/add', async (req, res) => {
  const patientData = req.body;
  patientData.resourceType = 'Patient'; 

  try {
    const accessToken = await getFhirAccessToken();
    const parent = `${FHIR_BASE_URL}/Patient`;

    const response = await axios.post(parent, patientData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      }
    });

    res.status(201).json({ message: 'Patient added successfully', data: response.data });
  } catch (error) {
    console.error('Error adding patient:', error.message);
    res.status(500).json({ error: 'Failed to add patient', details: error.message });
  }
});

// Get all Patients
router.get('/all', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/Patient`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const patients = await handleBlobResponse(response.data);
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error.message);
    res.status(500).json({ error: 'Failed to fetch patients', details: error.message });
  }
});

// Get one Patient by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/Patient/${id}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const patient = await handleBlobResponse(response.data);
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error.message);
    res.status(500).json({ error: 'Failed to fetch patient', details: error.message });
  }
});

export default router;
