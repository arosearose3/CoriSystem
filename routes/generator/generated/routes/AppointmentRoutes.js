// AppointmentRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
} from './AppointmentService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Appointment
router.post('/add', async (req, res) => {
  try {
    const result = await createAppointment(req.body);
    res.status(201).json({ message: 'Appointment created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Appointment`, details: error.message });
  }
});

// Get all Appointments
router.get('/all', async (req, res) => {
  try {
    const results = await getAllAppointments();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Appointments`, details: error.message });
  }
});

// Get one Appointment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Appointment ID is required.' });
    }
    const result = await getAppointmentById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Appointment`, details: error.message });
  }
});

// Update Appointment
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Appointment ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid appointment data.' });
    }
    const updatedAppointment = await updateAppointment(id, req.body);
    res.json({ message: 'Appointment updated successfully', data: updatedAppointment });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Appointment`, details: error.message });
  }
});

// Delete Appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Appointment ID is required.' });
    }
    const result = await deleteAppointment(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Appointment`, details: error.message });
  }
});



export default router;
