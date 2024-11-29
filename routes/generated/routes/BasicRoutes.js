// BasicRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createBasic,
  getAllBasics,
  getBasicById,
  updateBasic,
  deleteBasic
} from './BasicService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Basic
router.post('/add', async (req, res) => {
  try {
    const result = await createBasic(req.body);
    res.status(201).json({ message: 'Basic created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Basic`, details: error.message });
  }
});

// Get all Basics
router.get('/all', async (req, res) => {
  try {
    const results = await getAllBasics();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Basics`, details: error.message });
  }
});

// Get one Basic
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Basic ID is required.' });
    }
    const result = await getBasicById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Basic`, details: error.message });
  }
});

// Update Basic
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Basic ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid basic data.' });
    }
    const updatedBasic = await updateBasic(id, req.body);
    res.json({ message: 'Basic updated successfully', data: updatedBasic });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Basic`, details: error.message });
  }
});

// Delete Basic
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Basic ID is required.' });
    }
    const result = await deleteBasic(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Basic`, details: error.message });
  }
});



export default router;
