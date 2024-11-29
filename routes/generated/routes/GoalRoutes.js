// GoalRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createGoal,
  getAllGoals,
  getGoalById,
  updateGoal,
  deleteGoal
} from './GoalService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Goal
router.post('/add', async (req, res) => {
  try {
    const result = await createGoal(req.body);
    res.status(201).json({ message: 'Goal created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Goal`, details: error.message });
  }
});

// Get all Goals
router.get('/all', async (req, res) => {
  try {
    const results = await getAllGoals();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Goals`, details: error.message });
  }
});

// Get one Goal
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Goal ID is required.' });
    }
    const result = await getGoalById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Goal`, details: error.message });
  }
});

// Update Goal
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Goal ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid goal data.' });
    }
    const updatedGoal = await updateGoal(id, req.body);
    res.json({ message: 'Goal updated successfully', data: updatedGoal });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Goal`, details: error.message });
  }
});

// Delete Goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Goal ID is required.' });
    }
    const result = await deleteGoal(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Goal`, details: error.message });
  }
});



export default router;
