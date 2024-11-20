import express from 'express';
import { auth } from '../serverutils.js';
import {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  getOrganizationName,
  getOrganizationEmail,
  updateOrganization,
  deleteOrganization
} from './organizationService.js';

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
    const organization = await createOrganization(req.body);
    res.status(201).json({ message: 'Organization added successfully', data: organization });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add organization', error: error.message });
  }
});

// Get all Organizations
router.get('/all', async (req, res) => {
  try {
    const organizations = await getAllOrganizations();
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations', details: error.message });
  }
});

// Get Organization name
router.get('/getOrgName', async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'Organization reference is required' });
    }

    const name = await getOrganizationName(reference);
    res.json(name);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Organization name', details: error.message });
  }
});

// Get Organization email
router.get('/getOrgEmail', async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'Organization reference is required' });
    }

    const emailData = await getOrganizationEmail(reference);
    res.json(emailData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Organization email', details: error.message });
  }
});

// Get one Organization
router.get('/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }

    const organization = await getOrganizationById(organizationId);
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Organization', details: error.message });
  }
});

// Update Organization
router.put('/update/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid organization data.' });
    }

    const updatedOrganization = await updateOrganization(organizationId, req.body);
    res.json({ message: 'Organization updated successfully', data: updatedOrganization });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Organization', details: error.message });
  }
});

// Delete Organization
router.delete('/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }

    const result = await deleteOrganization(organizationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Organization', details: error.message });
  }
});

export default router;