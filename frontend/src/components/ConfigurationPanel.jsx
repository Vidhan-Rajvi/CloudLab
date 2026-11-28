import { useEffect, useState } from 'react'
import {
  DEFAULT_REGIONS,
  getConfigFields,
  getDefaultConfig,
} from '../utils/componentSchemas'

function ConfigurationPanel({ node, onSave, onClose }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('us-east-1')
  const [config, setConfig] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!node) return
    const defaults = getDefaultConfig(node.data?.componentId, node.data?.category)
    const merged = { ...defaults, ...(node.data?.config || {}) }
    setLabel(node.data?.label || '')
    setDescription(node.data?.description || '')
    setRegion(merged.region || 'us-east-1')
    setConfig(merged)
    setFormError('')
  }, [node])

  if (!node) return null

  const fields = getConfigFields(node.data?.category)

  const handleFieldChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!label.trim()) {
      setFormError('Component name is required.')
      return
    }

    for (const field of fields) {
      const val = String(config[field.key] ?? '').trim()
      if (field.required && !val) {
        setFormError(`${field.label} is required.`)
        return
      }
      if (field.type === 'number') {
        const num = Number(val)
        if (Number.isNaN(num)) {
          setFormError(`${field.label} must be a valid number.`)
          return
        }
        if (field.min !== undefined && num < field.min) {
          setFormError(`${field.label} must be at least ${field.min}.`)
          return
        }
        if (field.max !== undefined && num > field.max) {
          setFormError(`${field.label} must be at most ${field.max}.`)
          return
        }
      }
    }

    setFormError('')
    onSave(node.id, {
      label: label.trim(),
      description: description.trim() || node.data?.description,
      configured: true,
      config: {
        ...config,
        region,
      },
    })
  }

  return (
    <aside className="config-panel" aria-label="Component configuration">
      <div className="config-panel-header">
        <div>
          <span className="config-eyebrow">{node.data?.category}</span>
          <h3>Configure Resource</h3>
        </div>
        <button
          type="button"
          className="config-close-btn"
          onClick={onClose}
          aria-label="Close configuration panel"
        >
          ✕
        </button>
      </div>

      <form className="config-form" onSubmit={handleSubmit}>
        <label className="config-field">
          <span>Resource Name *</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., web-server-prod-01"
          />
        </label>

        <label className="config-field">
          <span>Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief resource role"
          />
        </label>

        <label className="config-field">
          <span>Region</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {DEFAULT_REGIONS.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
            <option value="global">global</option>
          </select>
        </label>

        <div className="config-divider">RESOURCE PARAMETERS</div>

        {fields.map((field) => (
          <label className="config-field" key={field.key}>
            <span>
              {field.label}
              {field.required ? ' *' : ''}
            </span>

            {field.type === 'select' ? (
              <select
                value={config[field.key] ?? ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                min={field.min}
                max={field.max}
                value={config[field.key] ?? ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              />
            )}
          </label>
        ))}

        {formError && <div className="config-error">{formError}</div>}

        <div className="config-actions">
          <button
            type="button"
            className="canvas-action secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="canvas-action primary">
            Save Configuration
          </button>
        </div>
      </form>
    </aside>
  )
}

export default ConfigurationPanel
