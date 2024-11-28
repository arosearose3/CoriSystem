// ProcedureRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createProcedure,
  getAllProcedures,
  getProcedureById,
  updateProcedure,
  deleteProcedure
} from './ProcedureService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Procedure
router.post('/add', async (req, res) => {
  try {
    const result = await createProcedure(req.body);
    res.status(201).json({ message: 'Procedure created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Procedure`, details: error.message });
  }
});

// Get all Procedures
router.get('/all', async (req, res) => {
  try {
    const results = await getAllProcedures();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Procedures`, details: error.message });
  }
});

// Get one Procedure
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Procedure ID is required.' });
    }
    const result = await getProcedureById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Procedure`, details: error.message });
  }
});

// Update Procedure
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Procedure ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid procedure data.' });
    }
    const updatedProcedure = await updateProcedure(id, req.body);
    res.json({ message: 'Procedure updated successfully', data: updatedProcedure });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Procedure`, details: error.message });
  }
});

// Delete Procedure
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Procedure ID is required.' });
    }
    const result = await deleteProcedure(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Procedure`, details: error.message });
  }
});



export default router;
