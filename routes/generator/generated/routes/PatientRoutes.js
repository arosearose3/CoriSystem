// PatientRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientName,
  searchByIdentifier
} from './PatientService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Patient
router.post('/add', async (req, res) => {
  try {
    const result = await createPatient(req.body);
    res.status(201).json({ message: 'Patient created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Patient`, details: error.message });
  }
});

// Get all Patients
router.get('/all', async (req, res) => {
  try {
    const results = await getAllPatients();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Patients`, details: error.message });
  }
});

// Get one Patient
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Patient ID is required.' });
    }
    const result = await getPatientById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Patient`, details: error.message });
  }
});

// Update Patient
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Patient ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid patient data.' });
    }
    const updatedPatient = await updatePatient(id, req.body);
    res.json({ message: 'Patient updated successfully', data: updatedPatient });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Patient`, details: error.message });
  }
});

// Delete Patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Patient ID is required.' });
    }
    const result = await deletePatient(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Patient`, details: error.message });
  }
});


// getPatientName
router.get('/getPatientName', async (req, res) => {
  try {
    
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'reference is required' });
    }
    
    const result = await getPatientName(reference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute getPatientName`, details: error.message });
  }
});

// searchByIdentifier
router.get('/searchByIdentifier', async (req, res) => {
  try {
    
    const { identifier } = req.query;
    if (!identifier) {
      return res.status(400).json({ error: 'identifier is required' });
    }
    
    const result = await searchByIdentifier(identifier);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute searchByIdentifier`, details: error.message });
  }
});

export default router;
