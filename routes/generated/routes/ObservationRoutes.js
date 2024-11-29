// ObservationRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createObservation,
  getAllObservations,
  getObservationById,
  updateObservation,
  deleteObservation
} from './ObservationService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Observation
router.post('/add', async (req, res) => {
  try {
    const result = await createObservation(req.body);
    res.status(201).json({ message: 'Observation created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Observation`, details: error.message });
  }
});

// Get all Observations
router.get('/all', async (req, res) => {
  try {
    const results = await getAllObservations();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Observations`, details: error.message });
  }
});

// Get one Observation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Observation ID is required.' });
    }
    const result = await getObservationById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Observation`, details: error.message });
  }
});

// Update Observation
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Observation ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid observation data.' });
    }
    const updatedObservation = await updateObservation(id, req.body);
    res.json({ message: 'Observation updated successfully', data: updatedObservation });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Observation`, details: error.message });
  }
});

// Delete Observation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Observation ID is required.' });
    }
    const result = await deleteObservation(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Observation`, details: error.message });
  }
});



export default router;
