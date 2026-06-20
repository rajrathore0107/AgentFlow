import { StateGraph, Annotation, START, END, MemorySaver } from '@langchain/langgraph';
import Execution from '../models/Execution.js';
import { runAgent } from './agentRunner.js';
import { broadcastToExecution } from '../websocket/handler.js';

export const approvalPromises = new Map();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GraphState = Annotation.Root({
  inputData: Annotation(),
  cumulativeContext: Annotation({
    reducer: (curr, next) => next ? curr + '\n' + next : curr,
    default: () => '',
  }),
  agentOutputs: Annotation({
    reducer: (curr, next) => ({ ...curr, ...next }),
    default: () => ({}),
  }),
  stepCounter: Annotation({
    reducer: (curr, next) => curr + next,
    default: () => 0,
  })
});

/**
 * Execute a workflow pipeline using LangGraph.
 */
export async function executeWorkflow(executionId, pipeline, inputData) {
  const workflow = pipeline.workflow_json;
  const { nodes = [], edges = [] } = workflow;

  if (nodes.length === 0) {
    await Execution.appendLog(executionId, {
      type: 'error',
      agent: 'System',
      message: 'No agents found in pipeline. Add at least one agent node.',
    });
    await Execution.updateStatus(executionId, 'failed');
    broadcastToExecution(executionId, { type: 'execution_failed', message: 'No agents in pipeline' });
    return;
  }

  // Calculate in-degrees and out-degrees to find start and end nodes
  const inDegree = {};
  const outDegree = {};
  nodes.forEach(n => {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
  });
  
  edges.forEach(e => {
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    if (outDegree[e.source] !== undefined) outDegree[e.source]++;
  });

  const startNodes = nodes.filter(n => inDegree[n.id] === 0);
  const endNodes = nodes.filter(n => outDegree[n.id] === 0);

  if (startNodes.length === 0) {
    await Execution.appendLog(executionId, {
      type: 'error',
      agent: 'System',
      message: 'No starting node found (circular dependencies without entry point).',
    });
    await Execution.updateStatus(executionId, 'failed');
    broadcastToExecution(executionId, { type: 'execution_failed', message: 'No starting node found' });
    return;
  }

  const builder = new StateGraph(GraphState);

  // Add nodes to the graph
  for (const node of nodes) {
    const agentRole = node.data?.role || node.data?.label || 'Agent';
    const agentLabel = node.data?.label || agentRole;
    const agentConfig = node.data?.config || {};

    const nodeFunction = async (state) => {
      broadcastToExecution(executionId, {
        type: 'agent_started',
        step: state.stepCounter + 1,
        totalSteps: nodes.length, // estimated
        agentId: node.id,
        agentRole,
        agentLabel,
      });

      await Execution.appendLog(executionId, {
        type: 'agent_start',
        agent: agentLabel,
        message: `Agent "${agentLabel}" (${agentRole}) started processing...`,
      });

      // Human-in-the-loop approval logic
      if (agentConfig.requiresApproval) {
        await Execution.updateStatus(executionId, 'awaiting_approval');
        await Execution.appendLog(executionId, {
          type: 'info',
          agent: 'System',
          message: `Pipeline paused. Awaiting human approval for agent "${agentLabel}".`,
        });
        
        broadcastToExecution(executionId, {
          type: 'awaiting_approval',
          agentId: node.id,
          agentRole,
          agentLabel,
        });

        try {
          await new Promise((resolve, reject) => {
            approvalPromises.set(executionId, { resolve, reject });
          });
          
          await Execution.updateStatus(executionId, 'running');
          await Execution.appendLog(executionId, {
            type: 'info',
            agent: 'System',
            message: `Approval granted. Resuming execution...`,
          });
          broadcastToExecution(executionId, { type: 'approval_granted' });
        } catch (err) {
          throw new Error('Rejected by human');
        }
      }

      // Simulate a small delay
      await delay(1500 + Math.random() * 2000);

      const agentInput = {
        userInput: state.inputData,
        cumulativeContext: state.cumulativeContext,
        config: agentConfig,
      };

      const output = await runAgent(agentRole, agentInput);

      await Execution.appendLog(executionId, {
        type: 'agent_complete',
        agent: agentLabel,
        message: `Agent "${agentLabel}" completed successfully.`,
        output: output.substring(0, 500),
      });

      broadcastToExecution(executionId, {
        type: 'agent_completed',
        step: state.stepCounter + 1,
        agentId: node.id,
        agentRole,
        agentLabel,
        output,
      });

      return {
        agentOutputs: { [node.id]: output },
        cumulativeContext: `--- ${agentLabel} Output ---\n${output}`,
        stepCounter: 1
      };
    };

    builder.addNode(node.id, nodeFunction);
  }

  // Add edges to the graph
  startNodes.forEach(node => builder.addEdge(START, node.id));
  edges.forEach(edge => builder.addEdge(edge.source, edge.target));
  endNodes.forEach(node => builder.addEdge(node.id, END));

  const checkpointer = new MemorySaver();
  const graph = builder.compile({ checkpointer });

  broadcastToExecution(executionId, {
    type: 'execution_started',
    totalSteps: nodes.length,
  });

  await Execution.appendLog(executionId, {
    type: 'info',
    agent: 'System',
    message: `Starting pipeline "${pipeline.name}" using LangGraph orchestration`,
  });

  try {
    const initialState = {
      inputData,
      cumulativeContext: `User Input: ${JSON.stringify(inputData)}\n\n`,
      agentOutputs: {},
      stepCounter: 0,
    };
    
    // Config needs a thread_id for the MemorySaver to work properly
    const config = { configurable: { thread_id: executionId } };
    
    const finalState = await graph.invoke(initialState, config);
    
    // Find the last agent output
    const lastNodeId = endNodes[0]?.id; 
    const finalOutput = finalState.agentOutputs[lastNodeId] || 'No output generated.';

    await Execution.setOutput(executionId, finalOutput);
    await Execution.updateStatus(executionId, 'completed');

    await Execution.appendLog(executionId, {
      type: 'info',
      agent: 'System',
      message: 'Pipeline execution completed successfully! 🎉',
    });

    broadcastToExecution(executionId, {
      type: 'execution_completed',
      output: finalOutput,
    });
  } catch (error) {
    console.error("LangGraph Execution Error:", error);
    
    await Execution.appendLog(executionId, {
      type: 'error',
      agent: 'System',
      message: `Execution failed: ${error.message}`,
    });

    await Execution.updateStatus(executionId, 'failed');
    broadcastToExecution(executionId, { type: 'execution_failed', message: error.message });
  }
}
