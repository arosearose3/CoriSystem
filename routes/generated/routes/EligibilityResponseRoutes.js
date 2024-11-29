// EligibilityResponseRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createEligibilityResponse,
  getAllEligibilityResponses,
  getEligibilityResponseById,
  updateEligibilityResponse,
  deleteEligibilityResponse
} from './EligibilityResponseService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new EligibilityResponse
router.post('/add', async (req, res) => {
  try {
    const result = await createEligibilityResponse(req.body);
    res.status(201).json({ message: 'EligibilityResponse created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create EligibilityResponse`, details: error.message });
  }
});

// Get all EligibilityResponses
router.get('/all', async (req, res) => {
  try {
    const results = await getAllEligibilityResponses();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch EligibilityResponses`, details: error.message });
  }
});

// Get one EligibilityResponse
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'EligibilityResponse ID is required.' });
    }
    const result = await getEligibilityResponseById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch EligibilityResponse`, details: error.message });
  }
});

// Update EligibilityResponse
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'EligibilityResponse ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid eligibilityresponse data.' });
    }
    const updatedEligibilityResponse = await updateEligibilityResponse(id, req.body);
    res.json({ message: 'EligibilityResponse updated successfully', data: updatedEligibilityResponse });
  } catch (error) {
    res.status(500).json({ error: `Failed to update EligibilityResponse`, details: error.message });
  }
});

// Delete EligibilityResponse
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'EligibilityResponse ID is required.' });
    }
    const result = await deleteEligibilityResponse(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete EligibilityResponse`, details: error.message });
  }
});



export default router;
