import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import axios from 'axios';
import { google } from 'googleapis';  // Assuming you use Google API for authentication
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed

import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary

const base = BASE_PATH;
const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        error: 'ActivityDefinition ID is required.' 
      });
    }

    const accessToken = await getFhirAccessToken();

    const response = await axios.delete(
      `${FHIR_BASE_URL}/ActivityDefinition/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    res.status(200).json({
      message: `ActivityDefinition with ID ${id} deleted successfully`,
      data: response.data
    });
  } catch (error) {
    console.error(`Error deleting ActivityDefinition with ID ${req.params.id}:`, error);
    if (error.response?.status === 404) {
      res.status(404).json({
        error: 'ActivityDefinition not found.',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete ActivityDefinition',
        details: error.message
      });
    }
  }
});


router.get('/all', async (req, res) => {
    try {
      const accessToken = await getFhirAccessToken();
      const url = `${FHIR_BASE_URL}/ActivityDefinition`;
  
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      });
  
      // If it's a Bundle, send the entries
      if (response.data.resourceType === 'Bundle' && response.data.entry) {
        res.json(response.data.entry.map(entry => entry.resource));
      } else {
        // If it's not a Bundle, send the raw response
        res.json(response.data);
      }
  
    } catch (error) {
      console.error('Error fetching ActivityDefinitions:', error);
      res.status(500).json({
        error: 'Failed to fetch ActivityDefinitions',
        details: error.message
      });
    }
  });
  
// Create new ActivityDefinition
router.post('/create', async (req, res) => {
  try {
    const activityDefinition = req.body;

    // Validate required fields
    if (!activityDefinition.name) {
      return res.status(400).json({ 
        error: 'Activity name is required.' 
      });
    }

    // Ensure required fields
    activityDefinition.resourceType = 'ActivityDefinition';
    activityDefinition.status = activityDefinition.status || 'active';
    activityDefinition.date = activityDefinition.date || new Date().toISOString();

    const accessToken = await getFhirAccessToken();
    
    // Check if ActivityDefinition with this name already exists
    const searchResponse = await axios.get(
      `${FHIR_BASE_URL}/ActivityDefinition?name=${activityDefinition.name}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    if (searchResponse.data.entry?.length > 0) {
      return res.status(409).json({
        error: 'An ActivityDefinition with this name already exists.'
      });
    }

    // Create new ActivityDefinition
    const response = await axios.post(
      `${FHIR_BASE_URL}/ActivityDefinition`,
      activityDefinition,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json'
        }
      }
    );

    res.status(201).json({
      message: 'ActivityDefinition created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error creating ActivityDefinition:', error);
    res.status(500).json({
      error: 'Failed to create ActivityDefinition',
      details: error.message
    });
  }
});

export default router;