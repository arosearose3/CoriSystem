// CoverageRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createCoverage,
  getAllCoverages,
  getCoverageById,
  updateCoverage,
  deleteCoverage
} from './CoverageService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Coverage
router.post('/add', async (req, res) => {
  try {
    const result = await createCoverage(req.body);
    res.status(201).json({ message: 'Coverage created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Coverage`, details: error.message });
  }
});

// Get all Coverages
router.get('/all', async (req, res) => {
  try {
    const results = await getAllCoverages();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Coverages`, details: error.message });
  }
});

// Get one Coverage
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Coverage ID is required.' });
    }
    const result = await getCoverageById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Coverage`, details: error.message });
  }
});

// Update Coverage
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Coverage ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid coverage data.' });
    }
    const updatedCoverage = await updateCoverage(id, req.body);
    res.json({ message: 'Coverage updated successfully', data: updatedCoverage });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Coverage`, details: error.message });
  }
});

// Delete Coverage
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Coverage ID is required.' });
    }
    const result = await deleteCoverage(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Coverage`, details: error.message });
  }
});



export default router;
