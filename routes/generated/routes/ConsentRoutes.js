// ConsentRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createConsent,
  getAllConsents,
  getConsentById,
  updateConsent,
  deleteConsent
} from './ConsentService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Consent
router.post('/add', async (req, res) => {
  try {
    const result = await createConsent(req.body);
    res.status(201).json({ message: 'Consent created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Consent`, details: error.message });
  }
});

// Get all Consents
router.get('/all', async (req, res) => {
  try {
    const results = await getAllConsents();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Consents`, details: error.message });
  }
});

// Get one Consent
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Consent ID is required.' });
    }
    const result = await getConsentById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Consent`, details: error.message });
  }
});

// Update Consent
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Consent ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid consent data.' });
    }
    const updatedConsent = await updateConsent(id, req.body);
    res.json({ message: 'Consent updated successfully', data: updatedConsent });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Consent`, details: error.message });
  }
});

// Delete Consent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Consent ID is required.' });
    }
    const result = await deleteConsent(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Consent`, details: error.message });
  }
});



export default router;
