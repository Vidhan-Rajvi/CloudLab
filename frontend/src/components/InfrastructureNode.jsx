import { Handle, Position } from '@xyflow/react'
import { summarizeConfig } from '../utils/componentSchemas'

function InfrastructureNode({ data, selected }) {
  const isConfigured = Boolean(data.configured)
  const summary = data.config
    ? summarizeConfig(data.category, data.config)
    : 'Design component'

  return (
    <div className={`infrastructure-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="node-handle target"
        title="Connect incoming resource"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="node-handle target"
        title="Connect incoming resource"
      />

      <div className="node-header-row">
        <div className={`node-icon ${data.color}`}>
          {data.icon}
        </div>
        {data.config?.region && (
          <span className="node-region-badge">{data.config.region}</span>
        )}
      </div>

      <div className="node-content">
        <span className="node-category">{data.category}</span>
        <strong>{data.label}</strong>
        <span className="node-description">{data.description}</span>
      </div>

      <div className="node-footer">
        <span className={`node-status-dot ${isConfigured ? 'configured' : ''}`} />
        <span className="node-summary-text">{summary}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="node-handle source"
        title="Drag to connect to another resource"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="node-handle source"
        title="Drag to connect to another resource"
      />
    </div>
  )
}

export default InfrastructureNode
