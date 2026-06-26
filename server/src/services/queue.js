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

export async function schedulePipeline(pipelineId, userId, cronExpression, inputData = {}) {
  const jobId = `schedule-${pipelineId}`;
  
  // Remove existing schedule if any
  await unschedulePipeline(pipelineId);
  
  await executionQueue.add('scheduled-pipeline', {
    pipelineId,
    userId,
    inputData
  }, {
    jobId, // ensure uniqueness
    repeat: { pattern: cronExpression },
  });
  
  return true;
}

export async function unschedulePipeline(pipelineId) {
  const repeatableJobs = await executionQueue.getRepeatableJobs();
  const job = repeatableJobs.find(j => j.id === `schedule-${pipelineId}`);
  if (job) {
    await executionQueue.removeRepeatableByKey(job.key);
    return true;
  }
  return false;
}

export const executionWorker = new Worker('workflow-executions', async (job) => {
  if (job.name === 'execute-pipeline') {
    const { executionId, pipelineId, inputData } = job.data;
    
    try {
      const pipeline = await Pipeline.findById(pipelineId);
      if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

      console.log(`[Queue] Starting background job for execution: ${executionId}`);
      await executeWorkflow(executionId, pipeline, inputData);
      console.log(`[Queue] Job for execution ${executionId} completed successfully.`);
    } catch (error) {
      console.error(`[Queue] Job ${job.id} failed:`, error);
      await Execution.updateStatus(executionId, 'failed');
      throw error;
    }
  } else if (job.name === 'scheduled-pipeline') {
    const { pipelineId, userId, inputData } = job.data;
    let executionId;
    
    try {
      const pipeline = await Pipeline.findById(pipelineId);
      if (!pipeline) {
        // If pipeline was deleted, we should remove the repeatable job
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      // Create a fresh execution record for this scheduled run
      const execution = await Execution.create({ pipelineId, userId, inputData });
      executionId = execution.id;

      console.log(`[Queue] Starting SCHEDULED job for pipeline: ${pipelineId}, execution: ${executionId}`);
      await executeWorkflow(executionId, pipeline, inputData);
      console.log(`[Queue] Scheduled job completed.`);
    } catch (error) {
      console.error(`[Queue] Scheduled Job ${job.id} failed:`, error);
      if (executionId) await Execution.updateStatus(executionId, 'failed');
      throw error;
    }
  }
}, { 
  connection,
  concurrency: 5 // Process up to 5 pipelines concurrently
});

executionWorker.on('failed', (job, err) => {
  console.error(`[Queue] Worker failed job ${job.id} with error: ${err.message}`);
});

console.log('✅ Redis Job Queue & Worker initialized successfully');
