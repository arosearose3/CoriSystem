// eventRoutes.js
import express from 'express';
import {
  createEventTemplate,
  searchEventTemplatesByType,
  getAllEventTemplates,
  getEventTemplateById
} from './templateEventService.js';

const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const templateData = req.body;

    if (!templateData.resourceType || templateData.resourceType !== 'Basic') {
      return res.status(400).json({ error: 'Invalid resource type - must be Basic' });
    }

    if (templateData.extension?.[0]?.extension?.some(e => e.url === 'type' && e.valueString === 'timer')) {
      return res.status(400).json({ error: 'Timer templates should be created through /api/timer endpoints' });
    }

    const result = await createEventTemplate(templateData);
    res.status(201).json({ message: 'Event Template created successfully', data: result });

  } catch (error) {
    console.error('Error creating Event Template:', error);
    res.status(500).json({ error: 'Failed to create Event Template', details: error.message });
  }
});

router.get('/search/byType', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) return res.status(400).json({ error: 'Type parameter is required' });

    const templates = await searchEventTemplatesByType(type);
    res.json(templates);

  } catch (error) {
    console.error('Error searching Event Templates by type:', error);
    res.status(500).json({ error: 'Failed to search Event Templates', details: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const { type } = req.query;
    const templates = await getAllEventTemplates(type);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching Event Templates:', error);
    res.status(500).json({ error: 'Failed to fetch Event Templates', details: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await getEventTemplateById(req.params.id);
    res.json(template);
  } catch (error) {
    console.error('Error fetching Event Template:', error);
    res.status(500).json({ error: `Failed to fetch Event Template: ${error.message}` });
  }
});

export default router;
