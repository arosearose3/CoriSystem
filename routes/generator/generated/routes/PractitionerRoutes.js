// PractitionerRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createPractitioner,
  getAllPractitioners,
  getPractitionerById,
  updatePractitioner,
  deletePractitioner
} from './PractitionerService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Practitioner
router.post('/add', async (req, res) => {
  try {
    const result = await createPractitioner(req.body);
    res.status(201).json({ message: 'Practitioner created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Practitioner`, details: error.message });
  }
});

// Get all Practitioners
router.get('/all', async (req, res) => {
  try {
    const results = await getAllPractitioners();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Practitioners`, details: error.message });
  }
});

// Get one Practitioner
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Practitioner ID is required.' });
    }
    const result = await getPractitionerById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Practitioner`, details: error.message });
  }
});

// Update Practitioner
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Practitioner ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid practitioner data.' });
    }
    const updatedPractitioner = await updatePractitioner(id, req.body);
    res.json({ message: 'Practitioner updated successfully', data: updatedPractitioner });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Practitioner`, details: error.message });
  }
});

// Delete Practitioner
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Practitioner ID is required.' });
    }
    const result = await deletePractitioner(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Practitioner`, details: error.message });
  }
});



export default router;
