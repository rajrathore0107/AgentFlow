import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Execution from '../models/Execution.js';
import Pipeline from '../models/Pipeline.js';
import { executeWorkflow, approvalPromises } from '../services/engine.js';

const router = Router();
router.use(authenticate);

// GET /api/executions - list user's executions
router.get('/', (req, res) => {
  try {
    const executions = Execution.findByUserId(req.userId);
    res.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// GET /api/executions/:id
router.get('/:id', (req, res) => {
  try {
    const execution = Execution.findById(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    if (execution.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// POST /api/executions - start a new execution
router.post('/', async (req, res) => {
  try {
    const { pipelineId, inputData } = req.body;

    if (!pipelineId) {
      return res.status(400).json({ error: 'Pipeline ID is required' });
    }

    const pipeline = Pipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    if (pipeline.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const execution = Execution.create({
      pipelineId,
      userId: req.userId,
      inputData: inputData || {},
    });

    // Start execution asynchronously
    executeWorkflow(execution.id, pipeline, inputData || {}).catch(err => {
      console.error('Workflow execution error:', err);
      Execution.updateStatus(execution.id, 'failed');
    });

    res.status(201).json({ execution });
  } catch (error) {
    console.error('Error starting execution:', error);
    res.status(500).json({ error: 'Failed to start execution' });
  }
});

// POST /api/executions/:id/approve
router.post('/:id/approve', (req, res) => {
  const promise = approvalPromises.get(req.params.id);
  if (promise) {
    promise.resolve();
    approvalPromises.delete(req.params.id);
    res.json({ success: true, message: 'Execution approved' });
  } else {
    res.status(400).json({ error: 'Execution is not awaiting approval' });
  }
});

// POST /api/executions/:id/reject
router.post('/:id/reject', (req, res) => {
  const promise = approvalPromises.get(req.params.id);
  if (promise) {
    promise.reject(new Error('Rejected by human'));
    approvalPromises.delete(req.params.id);
    res.json({ success: true, message: 'Execution rejected' });
  } else {
    res.status(400).json({ error: 'Execution is not awaiting approval' });
  }
});

export default router;
