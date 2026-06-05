import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { executionAPI } from '../services/api';

export default function ExecutionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('pending');
  const [output, setOutput] = useState('');
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    loadExecution();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe_execution' }));
        }
        wsRef.current.close();
      }
    };
  }, [id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const loadExecution = async () => {
    try {
      const res = await executionAPI.get(id);
      const e = res.data.execution;
      setExecution(e);
      setLogs(e.logs || []);
      setStatus(e.status);
      setOutput(e.output_data || '');
    } catch { navigate('/executions'); }
  };

  const connectWebSocket = () => {
    const wsUrl = `ws://localhost:3001/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const token = localStorage.getItem('agentflow_token');
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'auth_success') {
          ws.send(JSON.stringify({ type: 'subscribe_execution', executionId: id }));
        }

        // Handle execution events
        if (msg.type === 'execution_started') {
          setStatus('running');
          setSteps(Array(msg.totalSteps).fill({ status: 'pending' }));
        }
        
        if (msg.type === 'agent_started') {
          setCurrentStep(msg.step);
          setSteps(prev => {
            const next = [...prev];
            next[msg.step - 1] = { ...msg, status: 'running' };
            return next;
          });
          setLogs(prev => [...prev, { type: 'agent_start', agent: msg.agentLabel, message: `Agent "${msg.agentLabel}" started processing...`, timestamp: new Date().toISOString() }]);
        }

        if (msg.type === 'agent_completed') {
          setSteps(prev => {
            const next = [...prev];
            next[msg.step - 1] = { ...next[msg.step - 1], status: 'completed', output: msg.output };
            return next;
          });
          setLogs(prev => [...prev, { type: 'agent_complete', agent: msg.agentLabel, message: `Agent "${msg.agentLabel}" completed.`, timestamp: new Date().toISOString() }]);
        }

        if (msg.type === 'agent_failed') {
          setSteps(prev => {
            const next = [...prev];
            if (next[currentStep - 1]) next[currentStep - 1].status = 'failed';
            return next;
          });
          setLogs(prev => [...prev, { type: 'agent_error', agent: msg.agentRole, message: `Agent failed: ${msg.error}`, timestamp: new Date().toISOString() }]);
        }

        if (msg.type === 'execution_completed') {
          setStatus('completed');
          setOutput(msg.output);
          setLogs(prev => [...prev, { type: 'info', agent: 'System', message: 'Pipeline execution completed successfully! 🎉', timestamp: new Date().toISOString() }]);
        }

        if (msg.type === 'execution_failed') {
          setStatus('failed');
          setLogs(prev => [...prev, { type: 'error', agent: 'System', message: `Execution failed: ${msg.message}`, timestamp: new Date().toISOString() }]);
        }

      } catch (err) { console.error('WS Error:', err); }
    };

    ws.onclose = () => {
      // Reconnect logic could go here
    };
  };

  if (!execution) return <div className="page-loader"><div className="loader"></div></div>;

  return (
    <>
      <div className="app-topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/executions')}>← Back</button>
          <h2 style={{fontSize:16,fontWeight:600}}>Run: {execution.pipeline_name}</h2>
          <span className={`badge badge-${status === 'completed' ? 'success' : status === 'failed' ? 'error' : status === 'running' ? 'info' : 'default'}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="execution-page">
        <div className="execution-main">
          <div style={{marginBottom: 24}}>
            <h3 style={{fontSize: 18, marginBottom: 8}}>Execution Steps</h3>
            <p style={{color: 'var(--text-muted)', fontSize: 14}}>
              Topic: <strong>{execution.input_data?.topic || 'N/A'}</strong>
            </p>
          </div>

          {steps.length > 0 ? (
            <div className="execution-steps fade-in">
              {steps.map((step, idx) => {
                if (!step) return null;
                return (
                <div key={idx} className={`step-card ${step.status === 'running' ? 'active' : step.status}`}>
                  <div className="step-header">
                    <div className={`step-status ${step.status}`}>
                      {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'running' ? '⚙' : '•'}
                    </div>
                    <div>
                      <div className="step-name">Step {idx + 1}: {step.agentLabel || 'Agent'}</div>
                      <div className="step-role">Role: {step.agentRole || 'Unknown'}</div>
                    </div>
                  </div>
                  {step.output && (
                    <div className="step-output fade-in">
                      {step.output.substring(0, 300)}{step.output.length > 300 ? '...' : ''}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              {status === 'pending' || status === 'running' ? (
                <div><div className="loader" style={{margin:'0 auto 16px'}}></div><p>Initializing agents...</p></div>
              ) : (
                <p>No steps recorded.</p>
              )}
            </div>
          )}

          {output && (
            <div className="output-panel fade-in">
              <h3>Final Output</h3>
              <div className="output-content">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="execution-sidebar">
          <div className="execution-sidebar-header">
            Terminal Logs
          </div>
          <div className="execution-logs">
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="log-agent">[{log.agent}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </>
  );
}
