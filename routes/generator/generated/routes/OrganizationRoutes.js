// OrganizationRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrgName,
  getOrgEmail
} from './OrganizationService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Organization
router.post('/add', async (req, res) => {
  try {
    const result = await createOrganization(req.body);
    res.status(201).json({ message: 'Organization created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Organization`, details: error.message });
  }
});

// Get all Organizations
router.get('/all', async (req, res) => {
  try {
    const results = await getAllOrganizations();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Organizations`, details: error.message });
  }
});

// Get one Organization
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }
    const result = await getOrganizationById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Organization`, details: error.message });
  }
});

// Update Organization
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid organization data.' });
    }
    const updatedOrganization = await updateOrganization(id, req.body);
    res.json({ message: 'Organization updated successfully', data: updatedOrganization });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Organization`, details: error.message });
  }
});

// Delete Organization
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }
    const result = await deleteOrganization(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Organization`, details: error.message });
  }
});


// getOrgName
router.get('/getOrgName', async (req, res) => {
  try {
    
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'reference is required' });
    }
    
    const result = await getOrgName(reference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute getOrgName`, details: error.message });
  }
});

// getOrgEmail
router.get('/getOrgEmail', async (req, res) => {
  try {
    
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'reference is required' });
    }
    
    const result = await getOrgEmail(reference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute getOrgEmail`, details: error.message });
  }
});

export default router;
