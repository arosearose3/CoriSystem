// TaskRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateStatus,
  findByServiceRequest
} from './TaskService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Task
router.post('/add', async (req, res) => {
  try {
    const result = await createTask(req.body);
    res.status(201).json({ message: 'Task created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Task`, details: error.message });
  }
});

// Get all Tasks
router.get('/all', async (req, res) => {
  try {
    const results = await getAllTasks();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Tasks`, details: error.message });
  }
});

// Get one Task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required.' });
    }
    const result = await getTaskById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Task`, details: error.message });
  }
});

// Update Task
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid task data.' });
    }
    const updatedTask = await updateTask(id, req.body);
    res.json({ message: 'Task updated successfully', data: updatedTask });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Task`, details: error.message });
  }
});

// Delete Task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required.' });
    }
    const result = await deleteTask(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Task`, details: error.message });
  }
});


// updateStatus
router.put('/updateStatus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await updateStatus(id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute updateStatus`, details: error.message });
  }
});

// findByServiceRequest
router.get('/findByServiceRequest', async (req, res) => {
  try {
    
    const { serviceRequestId } = req.query;
    if (!serviceRequestId) {
      return res.status(400).json({ error: 'serviceRequestId is required' });
    }
    
    const result = await findByServiceRequest(serviceRequestId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute findByServiceRequest`, details: error.message });
  }
});

export default router;
