import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineAPI, executionAPI } from '../services/api';

export default function Dashboard() {
  const [pipelines, setPipelines] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, eRes] = await Promise.all([pipelineAPI.list(), executionAPI.list()]);
      setPipelines(pRes.data.pipelines);
      setExecutions(eRes.data.executions);
    } catch (err) { console.error(err); }
  };

  const createPipeline = async () => {
    if (!newName.trim()) return;
    try {
      const res = await pipelineAPI.create({ name: newName, description: newDesc });
      setShowModal(false);
      setNewName(''); setNewDesc('');
      navigate(`/pipeline/${res.data.pipeline.id}`);
    } catch (err) { console.error(err); }
  };

  const deletePipeline = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this pipeline?')) return;
    await pipelineAPI.delete(id);
    loadData();
  };

  const completed = executions.filter(e => e.status === 'completed').length;
  const running = executions.filter(e => e.status === 'running').length;

  return (
    <>
      <div className="app-topbar">
        <h2 style={{fontSize:18,fontWeight:700}}>Dashboard</h2>
      </div>
      <div className="app-content">
        <div className="stats-row fade-in">
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(124,58,237,0.15)',color:'var(--accent-light)'}}>📋</div>
            <div><div className="stat-value">{pipelines.length}</div><div className="stat-label">Pipelines</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(16,185,129,0.15)',color:'var(--success)'}}>✅</div>
            <div><div className="stat-value">{completed}</div><div className="stat-label">Completed Runs</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(59,130,246,0.15)',color:'var(--info)'}}>🔄</div>
            <div><div className="stat-value">{running}</div><div className="stat-label">Running</div></div>
          </div>
        </div>

        <div className="dashboard-header">
          <h2>Your Pipelines</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Pipeline</button>
        </div>

        {pipelines.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="empty-icon">🔧</div>
            <h3>No pipelines yet</h3>
            <p>Create your first AI agent pipeline to get started</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Pipeline</button>
          </div>
        ) : (
          <div className="pipeline-grid">
            {pipelines.map(p => (
              <div key={p.id} className="card pipeline-card fade-in" onClick={() => navigate(`/pipeline/${p.id}`)}>
                <div className="card-header">
                  <div className="card-title">{p.name}</div>
                  <button className="btn btn-icon btn-danger btn-sm" onClick={(e) => deletePipeline(e, p.id)}>🗑️</button>
                </div>
                {p.description && <div className="pipeline-desc">{p.description}</div>}
                <div className="pipeline-meta">
                  <span className={`tag ${p.status === 'draft' ? 'draft' : ''}`}>{p.status}</span>
                  <span className="pipeline-info">{(p.workflow_json?.nodes || []).length} agents</span>
                </div>
                <div className="pipeline-info" style={{marginTop:8}}>
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal fade-in" onClick={e => e.stopPropagation()}>
              <h3>Create New Pipeline</h3>
              <div className="form-group">
                <label className="form-label">Pipeline Name</label>
                <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Market Research Pipeline" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input form-textarea" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this pipeline do?" />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createPipeline} disabled={!newName.trim()}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
