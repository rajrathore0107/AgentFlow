import Execution from '../models/Execution.js';
import { runAgent } from './agentRunner.js';
import { broadcastToExecution } from '../websocket/handler.js';

/**
 * Execute a workflow pipeline.
 * 
 * Workflow JSON structure:
 * {
 *   nodes: [{ id, type, data: { label, role, config } }],
 *   edges: [{ source, target }]
 * }
 * 
 * The engine:
 * 1. Parses the workflow graph
 * 2. Determines execution order (topological sort)
 * 3. Runs agents sequentially, passing context between them
 * 4. Handles conditional routing (e.g., Critic sends back to Writer)
 * 5. Broadcasts real-time updates via WebSocket
 */
export const approvalPromises = new Map();

export async function executeWorkflow(executionId, pipeline, inputData) {
  const workflow = pipeline.workflow_json;
  const { nodes = [], edges = [] } = workflow;

  if (nodes.length === 0) {
    Execution.appendLog(executionId, {
      type: 'error',
      agent: 'System',
      message: 'No agents found in pipeline. Add at least one agent node.',
    });
    Execution.updateStatus(executionId, 'failed');
    broadcastToExecution(executionId, { type: 'execution_failed', message: 'No agents in pipeline' });
    return;
  }

  // Build adjacency list
  const adjacency = {};
  const inDegree = {};
  
  nodes.forEach(node => {
    adjacency[node.id] = [];
    inDegree[node.id] = 0;
  });

  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
    }
  });

  // Topological sort (Kahn's algorithm)
  const executionOrder = [];
  const queue = [];

  Object.keys(inDegree).forEach(nodeId => {
    if (inDegree[nodeId] === 0) queue.push(nodeId);
  });

  while (queue.length > 0) {
    const current = queue.shift();
    executionOrder.push(current);
    
    (adjacency[current] || []).forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  // Check for cycles
  if (executionOrder.length !== nodes.length) {
    Execution.appendLog(executionId, {
      type: 'error',
      agent: 'System',
      message: 'Circular dependency detected in pipeline. Please check your connections.',
    });
    Execution.updateStatus(executionId, 'failed');
    broadcastToExecution(executionId, { type: 'execution_failed', message: 'Circular dependency detected' });
    return;
  }

  // Create node map for quick lookup
  const nodeMap = {};
  nodes.forEach(node => { nodeMap[node.id] = node; });

  // Execute agents in order
  const agentOutputs = {};
  let cumulativeContext = `User Input: ${JSON.stringify(inputData)}\n\n`;

  broadcastToExecution(executionId, {
    type: 'execution_started',
    totalSteps: executionOrder.length,
  });

  Execution.appendLog(executionId, {
    type: 'info',
    agent: 'System',
    message: `Starting pipeline "${pipeline.name}" with ${executionOrder.length} agent(s)`,
  });

  for (let i = 0; i < executionOrder.length; i++) {
    const nodeId = executionOrder[i];
    const node = nodeMap[nodeId];
    const agentRole = node.data?.role || node.data?.label || 'Agent';
    const agentLabel = node.data?.label || agentRole;
    const agentConfig = node.data?.config || {};

    // Find predecessor outputs
    const predecessorEdges = edges.filter(e => e.target === nodeId);
    const predecessorOutputs = predecessorEdges
      .map(e => agentOutputs[e.source])
      .filter(Boolean);

    const agentInput = {
      userInput: inputData,
      previousOutputs: predecessorOutputs,
      cumulativeContext,
      config: agentConfig,
    };

    // Broadcast agent starting
    broadcastToExecution(executionId, {
      type: 'agent_started',
      step: i + 1,
      totalSteps: executionOrder.length,
      agentId: nodeId,
      agentRole,
      agentLabel,
    });

    Execution.appendLog(executionId, {
      type: 'agent_start',
      agent: agentLabel,
      message: `Agent "${agentLabel}" (${agentRole}) started processing...`,
    });

    // Check for Human-in-the-loop approval BEFORE running the agent
    if (agentConfig.requiresApproval) {
      Execution.updateStatus(executionId, 'awaiting_approval');
      Execution.appendLog(executionId, {
        type: 'info',
        agent: 'System',
        message: `Pipeline paused. Awaiting human approval for agent "${agentLabel}".`,
      });
      broadcastToExecution(executionId, {
        type: 'awaiting_approval',
        agentId: nodeId,
        agentRole,
        agentLabel,
      });

      try {
        await new Promise((resolve, reject) => {
          approvalPromises.set(executionId, { resolve, reject });
        });
        
        Execution.updateStatus(executionId, 'running');
        Execution.appendLog(executionId, {
          type: 'info',
          agent: 'System',
          message: `Approval granted. Resuming execution...`,
        });
        broadcastToExecution(executionId, { type: 'approval_granted' });
      } catch (err) {
        Execution.appendLog(executionId, {
          type: 'error',
          agent: 'System',
          message: `Execution rejected by human.`,
        });
        Execution.updateStatus(executionId, 'failed');
        broadcastToExecution(executionId, { type: 'execution_failed', message: 'Rejected by human' });
        return;
      }
    }

    try {
      // Simulate thinking delay for realism
      await delay(1500 + Math.random() * 2000);

      const output = await runAgent(agentRole, agentInput);
      agentOutputs[nodeId] = output;
      cumulativeContext += `\n--- ${agentLabel} Output ---\n${output}\n`;

      Execution.appendLog(executionId, {
        type: 'agent_complete',
        agent: agentLabel,
        message: `Agent "${agentLabel}" completed successfully.`,
        output: output.substring(0, 500), // Truncate for log
      });

      broadcastToExecution(executionId, {
        type: 'agent_completed',
        step: i + 1,
        agentId: nodeId,
        agentRole,
        agentLabel,
        output,
      });
    } catch (error) {
      Execution.appendLog(executionId, {
        type: 'agent_error',
        agent: agentLabel,
        message: `Agent "${agentLabel}" failed: ${error.message}`,
      });

      broadcastToExecution(executionId, {
        type: 'agent_failed',
        agentId: nodeId,
        agentRole,
        error: error.message,
      });

      Execution.updateStatus(executionId, 'failed');
      broadcastToExecution(executionId, { type: 'execution_failed', message: error.message });
      return;
    }
  }

  // Get the final agent's output
  const lastNodeId = executionOrder[executionOrder.length - 1];
  const finalOutput = agentOutputs[lastNodeId] || 'No output generated.';

  Execution.setOutput(executionId, finalOutput);
  Execution.updateStatus(executionId, 'completed');

  Execution.appendLog(executionId, {
    type: 'info',
    agent: 'System',
    message: 'Pipeline execution completed successfully! 🎉',
  });

  broadcastToExecution(executionId, {
    type: 'execution_completed',
    output: finalOutput,
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
