import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const router = express.Router();
const API_211_BASE_URL = 'https://api.211.org/search/v1/api/Filters'; // Base URL without Topics or TopicsSubtopics
const API_KEY = process.env.API_211_KEY; // Retrieve API key from .env

router.get('/search211', async (req, res) => {
    try {
        // Get Keyword, Topic, Subtopic, and Location from client request
        const { Keyword, Topic, Subtopic, Location } = req.query;

        // Ensure required fields are provided
        if (!Keyword || !Topic || !Subtopic || !Location) {
            return res.status(400).json({ error: "Keyword, Topic, Subtopic, and Location are required parameters." });
        }

        // Build the query string for the 211 API request
        const apiUrl = 'https://api.211.org/search/v1/api/Search/Keyword';

        const queryParams = new URLSearchParams({
            Keyword, // Add Keyword to the query params
            Topic,
            Subtopic,
            Location,
            StateProvince: 'CO', // Set to "CO" as requested
            IncludeStateNationalRecords: true, // Include state and national records
            Top: 1000, // Limit to 1000 results
            OrderBy: 'Relevance', // Default to 'Relevance'
            SearchMode: 'Any', // Default to 'Any'
            ReturnTaxonomyTermsIfNoResults: false, // Optional parameter
            SearchWithin: false, // Optional parameter
        });

        // Make the request to the 211 API
        const response = await axios.get(`${apiUrl}?${queryParams}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Api-Key' : API_KEY,
                'Authorization': `Bearer ${API_KEY}`, // Add authorization if required
                'Accept': 'application/json'
            }
        });

        // Send the 211 API response back to the client
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error making the API request:', error);
        res.status(500).json({ error: 'Failed to fetch search results from 211 API' });
    }
});

// Endpoint to get Topics and Subtopics from api.211.org
router.get('/getTopicsAndSubtopics', async (req, res) => {
  const url = `${API_211_BASE_URL}/TopicsSubtopics?topicOwner=AIRS-Default&topicLevel=3`; // Full endpoint URL for Topics and Subtopics
  try {
    // Make an Axios GET request to the 211 API
    const response = await axios.get(url, {
      headers: {
        'Api-Key': API_KEY, // Include API key in the headers
        'Cache-Control': 'no-cache',
      }
    });

    // Send the topics and subtopics JSON back to the client
    res.status(200).json(response.data);
  } catch (error) {
    // Handle errors, log them, and send a proper response
    console.error('Error fetching topics and subtopics from 211 API:', error.message);
    res.status(500).json({ error: 'Failed to fetch topics and subtopics from 211 API', details: error.message });
  }
});

// Endpoint to get Topics from api.211.org
router.get('/getTopics', async (req, res) => {
  const url = `${API_211_BASE_URL}/Topics`; // Full endpoint URL for Topics
  try {
    // Make an Axios GET request to the 211 API
    const response = await axios.get(url, {
      headers: {
        'Api-Key': API_KEY, // Include API key in the headers
        'Cache-Control': 'no-cache',
      }
    });

    // Send the list of topics back to the client
    res.status(200).json(response.data);
  } catch (error) {
    // Handle errors, log them, and send a proper response
    console.error('Error fetching topics from 211 API:', error.message);
    res.status(500).json({ error: 'Failed to fetch topics from 211 API', details: error.message });
  }
});

export default router;
