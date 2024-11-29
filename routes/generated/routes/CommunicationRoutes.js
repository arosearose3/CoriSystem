// CommunicationRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createCommunication,
  getAllCommunications,
  getCommunicationById,
  updateCommunication,
  deleteCommunication
} from './CommunicationService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Communication
router.post('/add', async (req, res) => {
  try {
    const result = await createCommunication(req.body);
    res.status(201).json({ message: 'Communication created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Communication`, details: error.message });
  }
});

// Get all Communications
router.get('/all', async (req, res) => {
  try {
    const results = await getAllCommunications();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Communications`, details: error.message });
  }
});

// Get one Communication
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Communication ID is required.' });
    }
    const result = await getCommunicationById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Communication`, details: error.message });
  }
});

// Update Communication
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Communication ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid communication data.' });
    }
    const updatedCommunication = await updateCommunication(id, req.body);
    res.json({ message: 'Communication updated successfully', data: updatedCommunication });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Communication`, details: error.message });
  }
});

// Delete Communication
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Communication ID is required.' });
    }
    const result = await deleteCommunication(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Communication`, details: error.message });
  }
});



export default router;
