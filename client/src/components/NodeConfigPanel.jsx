import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

const AGENT_ROLES = [
  { role: 'researcher', label: 'Researcher', color: '#3b82f6', icon: '🔍' },
  { role: 'analyst', label: 'Analyst', color: '#8b5cf6', icon: '📊' },
  { role: 'writer', label: 'Writer', color: '#10b981', icon: '✍️' },
  { role: 'critic', label: 'Critic', color: '#f59e0b', icon: '🔎' },
  { role: 'custom', label: 'Custom', color: '#ec4899', icon: '⚙️' },
];

const DEFAULT_SYSTEM_PROMPTS = {
  researcher: `You are an expert Research Agent. Your job is to gather comprehensive, accurate, and up-to-date information on the provided topic.\nStructure your findings clearly with:\n1. Key Data Points & Statistics\n2. Industry Trends\n3. Major Players / Competitors\n4. Summary of Sources`,
  analyst: `You are an expert Data Analyst Agent. Your job is to analyze the research data provided to you and identify critical patterns, trends, and strategic insights.\nStructure your analysis with:\n1. Executive Summary\n2. Key Insights & Market Opportunities\n3. Risk Assessment\n4. Strategic Recommendations`,
  writer: `You are an expert Content Writer Agent. Your job is to take research and analysis data and synthesize it into a highly polished, professional report.\nUse markdown formatting (headings, bullet points, bold text) to make it highly readable.`,
  critic: `You are an expert Critic and Quality Assurance Agent. Your job is to review the drafted report for quality, logical flow, accuracy, and completeness.\nStructure your review with:\n1. Overall Assessment (Score out of 10)\n2. Strengths\n3. Areas for Improvement\n4. Fact-Check Summary`,
  custom: `You are a helpful AI assistant acting as a step in a larger workflow pipeline. Process the input and context provided to you. Be concise and structured in your output.`,
};

export default function NodeConfigPanel({ selectedNode, onClose }) {
  const { setNodes } = useReactFlow();
  const [label, setLabel] = useState('');
  const [role, setRole] = useState('custom');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);

  useEffect(() => {
    if (!selectedNode) return;
    setLabel(selectedNode.data.label || '');
    setRole(selectedNode.data.role || 'custom');
    setSystemPrompt(selectedNode.data.config?.systemPrompt || DEFAULT_SYSTEM_PROMPTS[selectedNode.data.role || 'custom'] || '');
    setRequiresApproval(selectedNode.data.config?.requiresApproval || false);
    setEnableWebSearch(selectedNode.data.config?.enableWebSearch || false);
  }, [selectedNode]);

  const handleRoleChange = (newRole) => {
    const roleDef = AGENT_ROLES.find(r => r.role === newRole);
    setRole(newRole);
    setSystemPrompt(DEFAULT_SYSTEM_PROMPTS[newRole] || '');
    if (roleDef) {
      setLabel(prev => {
        // Only auto-update label if it looks like the default name
        const isAutoLabel = AGENT_ROLES.some(r => prev.startsWith(r.label));
        return isAutoLabel ? `${roleDef.label} Agent` : prev;
      });
      // Update color immediately
      setNodes(nodes => nodes.map(n =>
        n.id === selectedNode.id ? { ...n, data: { ...n.data, color: roleDef.color, icon: roleDef.icon } } : n
      ));
    }
  };

  const handleSave = () => {
    setNodes(nodes => nodes.map(n => {
      if (n.id !== selectedNode.id) return n;
      const roleDef = AGENT_ROLES.find(r => r.role === role);
      return {
        ...n,
        data: {
          ...n.data,
          label,
          role,
          color: roleDef?.color || n.data.color,
          icon: roleDef?.icon || n.data.icon,
          config: {
            ...n.data.config,
            systemPrompt: systemPrompt !== DEFAULT_SYSTEM_PROMPTS[role] ? systemPrompt : undefined,
            requiresApproval,
            enableWebSearch,
          },
        },
      };
    }));
    onClose();
  };

  if (!selectedNode) return null;

  const currentRoleDef = AGENT_ROLES.find(r => r.role === role);

  return (
    <div className="node-config-panel fade-in">
      <div className="node-config-header">
        <div className="node-config-title">
          <span>{currentRoleDef?.icon}</span>
          <span>Agent Settings</span>
        </div>
        <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
      </div>

      <div className="node-config-body">
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            className="form-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Agent display name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Agent Role</label>
          <div className="role-selector">
            {AGENT_ROLES.map(r => (
              <button
                key={r.role}
                className={`role-btn ${role === r.role ? 'active' : ''}`}
                style={role === r.role ? { borderColor: r.color, color: r.color, background: `${r.color}18` } : {}}
                onClick={() => handleRoleChange(r.role)}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">System Prompt</label>
          <textarea
            className="form-input form-textarea"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Override the agent's system prompt..."
            style={{ minHeight: 140, fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6 }}
          />
          <span className="form-error" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            Customizes how this agent thinks and responds
          </span>
        </div>

        <div className="node-config-toggles">
          <label className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-label">🔍 Enable Web Search</span>
              <span className="toggle-desc">Agent can search the web via Tavily</span>
            </div>
            <div className={`toggle-switch ${enableWebSearch ? 'on' : ''}`} onClick={() => setEnableWebSearch(v => !v)}>
              <div className="toggle-thumb" />
            </div>
          </label>

          <label className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-label">⏸ Pause for Approval</span>
              <span className="toggle-desc">Require human approval before running</span>
            </div>
            <div className={`toggle-switch ${requiresApproval ? 'on' : ''}`} onClick={() => setRequiresApproval(v => !v)}>
              <div className="toggle-thumb" />
            </div>
          </label>
        </div>
      </div>

      <div className="node-config-footer">
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
}
