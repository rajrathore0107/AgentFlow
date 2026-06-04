import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Controls, Background, MiniMap,
  addEdge, useNodesState, useEdgesState,
  MarkerType, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { pipelineAPI, executionAPI } from '../services/api';
import AgentNode from '../components/AgentNode';

const nodeTypes = { agentNode: AgentNode };

const AGENT_TYPES = [
  { role: 'researcher', label: 'Researcher', color: '#3b82f6', icon: '🔍', desc: 'Searches & gathers info' },
  { role: 'analyst', label: 'Analyst', color: '#8b5cf6', icon: '📊', desc: 'Analyzes data & patterns' },
  { role: 'writer', label: 'Writer', color: '#10b981', icon: '✍️', desc: 'Writes structured content' },
  { role: 'critic', label: 'Critic', color: '#f59e0b', icon: '🔎', desc: 'Reviews & fact-checks' },
  { role: 'custom', label: 'Custom', color: '#ec4899', icon: '⚙️', desc: 'Custom agent role' },
];

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#7c3aed', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
};

export default function PipelineBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [runTopic, setRunTopic] = useState('');
  const [running, setRunning] = useState(false);
  const reactFlowWrapper = useRef(null);

  useEffect(() => {
    loadPipeline();
  }, [id]);

  const loadPipeline = async () => {
    try {
      const res = await pipelineAPI.get(id);
      const p = res.data.pipeline;
      setPipeline(p);
      if (p.workflow_json?.nodes) setNodes(p.workflow_json.nodes);
      if (p.workflow_json?.edges) setEdges(p.workflow_json.edges);
    } catch { navigate('/'); }
  };

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
  }, [setEdges]);

  const addAgent = (agentType) => {
    const newNode = {
      id: `agent_${Date.now()}`,
      type: 'agentNode',
      position: { x: 100 + nodes.length * 60, y: 100 + nodes.length * 80 },
      data: {
        label: `${agentType.label} ${nodes.filter(n => n.data.role === agentType.role).length + 1}`,
        role: agentType.role,
        color: agentType.color,
        icon: agentType.icon,
        config: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const savePipeline = async () => {
    setSaving(true);
    try {
      await pipelineAPI.update(id, {
        workflowJson: { nodes, edges },
        status: nodes.length > 0 ? 'ready' : 'draft',
      });
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const runPipeline = async () => {
    if (!runTopic.trim()) return;
    setRunning(true);
    try {
      await savePipeline();
      const res = await executionAPI.start({
        pipelineId: id,
        inputData: { topic: runTopic },
      });
      setShowRun(false);
      navigate(`/execution/${res.data.execution.id}`);
    } catch (err) { console.error(err); }
    setRunning(false);
  };

  const deleteNode = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  if (!pipeline) return <div className="page-loader"><div className="loader"></div></div>;

  return (
    <>
      <div className="app-topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>← Back</button>
          <h2 style={{fontSize:16,fontWeight:600}}>{pipeline.name}</h2>
          <span className={`badge ${pipeline.status === 'ready' ? 'badge-success' : 'badge-default'}`}>{pipeline.status}</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={savePipeline} disabled={saving}>
            {saving ? '💾 Saving...' : '💾 Save'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRun(true)} disabled={nodes.length === 0}>
            ▶️ Run Pipeline
          </button>
        </div>
      </div>

      <div className="canvas-page">
        <div className="canvas-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            colorMode="dark"
          >
            <Background variant="dots" gap={20} size={1} color="rgba(255,255,255,0.05)" />
            <Controls />
            <MiniMap
              nodeColor={(n) => n.data?.color || '#7c3aed'}
              style={{ background: '#12121a' }}
            />
          </ReactFlow>
        </div>

        <div className="canvas-sidebar">
          <h3>Agent Palette</h3>
          <div className="agent-palette">
            {AGENT_TYPES.map(agent => (
              <div key={agent.role} className="agent-palette-item" onClick={() => addAgent(agent)}>
                <div className="agent-dot" style={{background: agent.color}}></div>
                <div>
                  <div className="agent-label">{agent.icon} {agent.label}</div>
                  <div className="agent-desc">{agent.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <h3>Instructions</h3>
          <div style={{padding:'8px 16px',fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>
            <p>1. Click an agent type to add it to the canvas</p>
            <p>2. Drag nodes to position them</p>
            <p>3. Connect agents by dragging from one handle to another</p>
            <p>4. Save your pipeline and click Run</p>
          </div>
        </div>
      </div>

      {showRun && (
        <div className="modal-overlay" onClick={() => setShowRun(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <h3>▶️ Run Pipeline</h3>
            <div className="form-group">
              <label className="form-label">Topic / Input</label>
              <input className="form-input" value={runTopic} onChange={e => setRunTopic(e.target.value)}
                placeholder="e.g. AI Agent market trends in 2026" autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRun(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={runPipeline} disabled={running || !runTopic.trim()}>
                {running ? 'Starting...' : '▶️ Start Execution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
