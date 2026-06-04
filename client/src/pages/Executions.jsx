import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { executionAPI } from '../services/api';

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await executionAPI.list();
      setExecutions(res.data.executions);
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <div className="app-topbar">
        <h2 style={{fontSize:18,fontWeight:700}}>Executions</h2>
      </div>
      <div className="app-content">
        {executions.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="empty-icon">▶️</div>
            <h3>No executions yet</h3>
            <p>Run a pipeline to see your execution history here.</p>
            <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
          </div>
        ) : (
          <div className="pipeline-grid">
            {executions.map(e => (
              <div key={e.id} className="card pipeline-card fade-in" onClick={() => navigate(`/execution/${e.id}`)}>
                <div className="card-header">
                  <div className="card-title">Run: {e.pipeline_name}</div>
                  <span className={`badge badge-${e.status === 'completed' ? 'success' : e.status === 'failed' ? 'error' : e.status === 'running' ? 'info' : 'default'}`}>
                    {e.status}
                  </span>
                </div>
                <div className="pipeline-desc" style={{marginBottom: 12}}>
                  <strong>Topic:</strong> {e.input_data?.topic || 'N/A'}
                </div>
                <div className="pipeline-info">
                  Started: {new Date(e.created_at).toLocaleString()}
                </div>
                {e.completed_at && (
                  <div className="pipeline-info" style={{marginTop: 4}}>
                    Completed: {new Date(e.completed_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
