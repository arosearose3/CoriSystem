// ConditionRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createCondition,
  getAllConditions,
  getConditionById,
  updateCondition,
  deleteCondition
} from './ConditionService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Condition
router.post('/add', async (req, res) => {
  try {
    const result = await createCondition(req.body);
    res.status(201).json({ message: 'Condition created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Condition`, details: error.message });
  }
});

// Get all Conditions
router.get('/all', async (req, res) => {
  try {
    const results = await getAllConditions();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Conditions`, details: error.message });
  }
});

// Get one Condition
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Condition ID is required.' });
    }
    const result = await getConditionById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Condition`, details: error.message });
  }
});

// Update Condition
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Condition ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid condition data.' });
    }
    const updatedCondition = await updateCondition(id, req.body);
    res.json({ message: 'Condition updated successfully', data: updatedCondition });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Condition`, details: error.message });
  }
});

// Delete Condition
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Condition ID is required.' });
    }
    const result = await deleteCondition(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Condition`, details: error.message });
  }
});



export default router;
