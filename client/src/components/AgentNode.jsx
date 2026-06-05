import { Handle, Position, useReactFlow } from '@xyflow/react';

export default function AgentNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const toggleApproval = (e) => {
    setNodes(nodes => nodes.map(n => 
      n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, requiresApproval: e.target.checked } } } : n
    ));
  };
  return (
    <div className={`agent-node fade-in ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ background: '#7c3aed', width: 10, height: 10 }} />
      
      <div className="agent-node-header">
        <div className="node-dot" style={{ backgroundColor: data.color || '#7c3aed' }}></div>
        <div className="node-role" style={{ color: data.color || '#7c3aed' }}>{data.role}</div>
      </div>
      
      <div className="agent-node-body">
        <div className="node-label">{data.icon} {data.label}</div>
        <div className="node-desc">Processing step in pipeline</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={data.config?.requiresApproval || false} onChange={toggleApproval} />
          Pause for human approval
        </label>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: '#7c3aed', width: 10, height: 10 }} />
    </div>
  );
}
