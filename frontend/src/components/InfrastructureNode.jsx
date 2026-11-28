function InfrastructureNode({ data, selected }) {
  return (
    <div className={`infrastructure-node ${selected ? 'selected' : ''}`}>
      <div className={`node-icon ${data.color}`}>
        {data.icon}
      </div>

      <div className="node-content">
        <span className="node-category">{data.category}</span>
        <strong>{data.label}</strong>
        <span className="node-description">{data.description}</span>
      </div>

      <div className="node-footer">
        <span className="node-status-dot" />
        <span>Design component</span>
      </div>
    </div>
  )
}

export default InfrastructureNode
