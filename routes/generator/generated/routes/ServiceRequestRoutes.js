// ServiceRequestRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createServiceRequest,
  getAllServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  deleteServiceRequest,
  findByPatient,
  findActive
} from './ServiceRequestService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new ServiceRequest
router.post('/add', async (req, res) => {
  try {
    const result = await createServiceRequest(req.body);
    res.status(201).json({ message: 'ServiceRequest created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create ServiceRequest`, details: error.message });
  }
});

// Get all ServiceRequests
router.get('/all', async (req, res) => {
  try {
    const results = await getAllServiceRequests();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch ServiceRequests`, details: error.message });
  }
});

// Get one ServiceRequest
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ServiceRequest ID is required.' });
    }
    const result = await getServiceRequestById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch ServiceRequest`, details: error.message });
  }
});

// Update ServiceRequest
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ServiceRequest ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid servicerequest data.' });
    }
    const updatedServiceRequest = await updateServiceRequest(id, req.body);
    res.json({ message: 'ServiceRequest updated successfully', data: updatedServiceRequest });
  } catch (error) {
    res.status(500).json({ error: `Failed to update ServiceRequest`, details: error.message });
  }
});

// Delete ServiceRequest
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ServiceRequest ID is required.' });
    }
    const result = await deleteServiceRequest(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete ServiceRequest`, details: error.message });
  }
});


// findByPatient
router.get('/findByPatient', async (req, res) => {
  try {
    
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }
    
    const result = await findByPatient(patientId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute findByPatient`, details: error.message });
  }
});

// findActive
router.get('/findActive', async (req, res) => {
  try {
    
    const result = await findActive();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute findActive`, details: error.message });
  }
});

export default router;
