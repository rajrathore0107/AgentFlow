import { Handle, Position } from '@xyflow/react';

export default function AgentNode({ id, data, selected }) {
  const hasWebSearch = data.config?.enableWebSearch;
  const hasApproval = data.config?.requiresApproval;
  const hasCodeInterpreter = data.config?.enableCodeInterpreter;
  const hasMemory = data.config?.enableMemory;
  const hasCustomPrompt = !!data.config?.systemPrompt;

  return (
    <div className={`agent-node fade-in ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ background: data.color || '#7c3aed', width: 10, height: 10 }} />

      <div className="agent-node-header" style={{ borderLeft: `3px solid ${data.color || '#7c3aed'}` }}>
        <div className="node-dot" style={{ backgroundColor: data.color || '#7c3aed' }} />
        <div className="node-role" style={{ color: data.color || '#7c3aed' }}>{data.role}</div>
        {hasCustomPrompt && (
          <span className="node-badge" title="Custom prompt configured">✏️</span>
        )}
      </div>

      <div className="agent-node-body">
        <div className="node-label">{data.icon} {data.label}</div>
        <div className="node-desc">
          {data.config?.systemPrompt
            ? data.config.systemPrompt.substring(0, 55) + (data.config.systemPrompt.length > 55 ? '...' : '')
            : 'Processing step in pipeline'}
        </div>

        {(hasWebSearch || hasApproval || hasCodeInterpreter || hasMemory) && (
          <div className="node-tags">
            {hasWebSearch && <span className="node-tag">🔍 Search</span>}
            {hasCodeInterpreter && <span className="node-tag" style={{background: 'rgba(16, 185, 129, 0.15)', color: '#10b981'}}>⚙️ JS Code</span>}
            {hasMemory && <span className="node-tag" style={{background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899'}}>🧠 Memory</span>}
            {hasApproval && <span className="node-tag warning">⏸ Approval</span>}
          </div>
        )}

        <div className="node-hint">Double-click to configure</div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: data.color || '#7c3aed', width: 10, height: 10 }} />
    </div>
  );
}
