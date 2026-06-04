import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Pipeline from '../models/Pipeline.js';

const router = Router();

// All pipeline routes require authentication
router.use(authenticate);

// GET /api/pipelines
router.get('/', (req, res) => {
  try {
    const pipelines = Pipeline.findByUserId(req.userId);
    res.json({ pipelines });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

// GET /api/pipelines/:id
router.get('/:id', (req, res) => {
  try {
    const pipeline = Pipeline.findById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    if (pipeline.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ pipeline });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// POST /api/pipelines
router.post('/', (req, res) => {
  try {
    const { name, description, workflowJson } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required' });
    }

    const pipeline = Pipeline.create({
      userId: req.userId,
      name,
      description,
      workflowJson,
    });

    res.status(201).json({ pipeline });
  } catch (error) {
    console.error('Error creating pipeline:', error);
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

// PUT /api/pipelines/:id
router.put('/:id', (req, res) => {
  try {
    const existing = Pipeline.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    if (existing.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, workflowJson, status } = req.body;
    const pipeline = Pipeline.update(req.params.id, {
      name,
      description,
      workflowJson,
      status,
    });

    res.json({ pipeline });
  } catch (error) {
    console.error('Error updating pipeline:', error);
    res.status(500).json({ error: 'Failed to update pipeline' });
  }
});

// DELETE /api/pipelines/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = Pipeline.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    if (existing.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Pipeline.delete(req.params.id);
    res.json({ message: 'Pipeline deleted successfully' });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    res.status(500).json({ error: 'Failed to delete pipeline' });
  }
});

export default router;
