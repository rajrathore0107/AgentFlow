import { Handle, Position } from '@xyflow/react';

export default function AgentNode({ data, selected }) {
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
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: '#7c3aed', width: 10, height: 10 }} />
    </div>
  );
}
