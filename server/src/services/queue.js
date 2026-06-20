import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import config from '../config.js';
import { executeWorkflow } from './engine.js';
import Pipeline from '../models/Pipeline.js';
import Execution from '../models/Execution.js';

// Create a reusable Redis connection for BullMQ
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const executionQueue = new Queue('workflow-executions', { connection });

// Initialize the worker that processes background execution jobs
export const executionWorker = new Worker('workflow-executions', async (job) => {
  const { executionId, pipelineId, inputData } = job.data;
  
  try {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    console.log(`[Queue] Starting background job for execution: ${executionId}`);
    
    // Execute the LangGraph workflow
    await executeWorkflow(executionId, pipeline, inputData);
    
    console.log(`[Queue] Job for execution ${executionId} completed successfully.`);
  } catch (error) {
    console.error(`[Queue] Job ${job.id} failed:`, error);
    await Execution.updateStatus(executionId, 'failed');
    throw error;
  }
}, { 
  connection,
  concurrency: 5 // Process up to 5 pipelines concurrently
});

executionWorker.on('failed', (job, err) => {
  console.error(`[Queue] Worker failed job ${job.id} with error: ${err.message}`);
});

console.log('✅ Redis Job Queue & Worker initialized successfully');
