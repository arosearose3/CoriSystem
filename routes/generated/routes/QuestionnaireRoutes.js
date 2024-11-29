// QuestionnaireRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createQuestionnaire,
  getAllQuestionnaires,
  getQuestionnaireById,
  updateQuestionnaire,
  deleteQuestionnaire
} from './QuestionnaireService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new Questionnaire
router.post('/add', async (req, res) => {
  try {
    const result = await createQuestionnaire(req.body);
    res.status(201).json({ message: 'Questionnaire created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create Questionnaire`, details: error.message });
  }
});

// Get all Questionnaires
router.get('/all', async (req, res) => {
  try {
    const results = await getAllQuestionnaires();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Questionnaires`, details: error.message });
  }
});

// Get one Questionnaire
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Questionnaire ID is required.' });
    }
    const result = await getQuestionnaireById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Questionnaire`, details: error.message });
  }
});

// Update Questionnaire
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Questionnaire ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid questionnaire data.' });
    }
    const updatedQuestionnaire = await updateQuestionnaire(id, req.body);
    res.json({ message: 'Questionnaire updated successfully', data: updatedQuestionnaire });
  } catch (error) {
    res.status(500).json({ error: `Failed to update Questionnaire`, details: error.message });
  }
});

// Delete Questionnaire
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Questionnaire ID is required.' });
    }
    const result = await deleteQuestionnaire(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete Questionnaire`, details: error.message });
  }
});



export default router;
