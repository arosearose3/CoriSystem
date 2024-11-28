// QuestionnaireResponseRoutes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  createQuestionnaireResponse,
  getAllQuestionnaireResponses,
  getQuestionnaireResponseById,
  updateQuestionnaireResponse,
  deleteQuestionnaireResponse
} from './QuestionnaireResponseService.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new QuestionnaireResponse
router.post('/add', async (req, res) => {
  try {
    const result = await createQuestionnaireResponse(req.body);
    res.status(201).json({ message: 'QuestionnaireResponse created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: `Failed to create QuestionnaireResponse`, details: error.message });
  }
});

// Get all QuestionnaireResponses
router.get('/all', async (req, res) => {
  try {
    const results = await getAllQuestionnaireResponses();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch QuestionnaireResponses`, details: error.message });
  }
});

// Get one QuestionnaireResponse
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'QuestionnaireResponse ID is required.' });
    }
    const result = await getQuestionnaireResponseById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch QuestionnaireResponse`, details: error.message });
  }
});

// Update QuestionnaireResponse
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'QuestionnaireResponse ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid questionnaireresponse data.' });
    }
    const updatedQuestionnaireResponse = await updateQuestionnaireResponse(id, req.body);
    res.json({ message: 'QuestionnaireResponse updated successfully', data: updatedQuestionnaireResponse });
  } catch (error) {
    res.status(500).json({ error: `Failed to update QuestionnaireResponse`, details: error.message });
  }
});

// Delete QuestionnaireResponse
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'QuestionnaireResponse ID is required.' });
    }
    const result = await deleteQuestionnaireResponse(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to delete QuestionnaireResponse`, details: error.message });
  }
});



export default router;
