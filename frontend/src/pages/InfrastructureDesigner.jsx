import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import InfrastructureNode from '../components/InfrastructureNode'
import ConfigurationPanel from '../components/ConfigurationPanel'
import {
  COMPONENT_CATALOG,
  COMPONENT_CATEGORIES,
} from '../data/componentCatalog'
import { validateConnection } from '../utils/connectionRules'
import { getDefaultConfig } from '../utils/componentSchemas'
import {
  createDesign,
  deleteDesign,
  fetchDesignById,
  fetchDesigns,
  updateDesign,
} from '../services/api'
import './InfrastructureDesigner.css'

const buildInitialNodes = () => [
  {
    id: 'cloud-1',
    type: 'infrastructure',
    position: { x: 80, y: 120 },
    data: {
      label: 'AWS Cloud',
      category: 'CLOUD',
      description: 'Amazon Web Services environment',
      icon: '☁',
      color: 'orange',
      componentId: 'aws-cloud',
      configured: true,
      config: getDefaultConfig('aws-cloud', 'CLOUD'),
    },
  },
  {
    id: 'compute-1',
    type: 'infrastructure',
    position: { x: 400, y: 120 },
    data: {
      label: 'Virtual Machine',
      category: 'COMPUTE',
      description: 'Virtual compute instance',
      icon: '▣',
      color: 'blue',
      componentId: 'virtual-machine',
      configured: true,
      config: getDefaultConfig('virtual-machine', 'COMPUTE'),
    },
  },
  {
    id: 'database-1',
    type: 'infrastructure',
    position: { x: 720, y: 120 },
    data: {
      label: 'PostgreSQL',
      category: 'DATABASE',
      description: 'Relational database',
      icon: '▤',
      color: 'blue',
      componentId: 'postgresql',
      configured: true,
      config: getDefaultConfig('postgresql', 'DATABASE'),
    },
  },
]

const nodeTypes = {
  infrastructure: InfrastructureNode,
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#8b7cff',
  },
  style: {
    stroke: '#8b7cff',
    strokeWidth: 2,
  },
  labelStyle: {
    fill: '#dce2f0',
    fontSize: 10,
    fontWeight: 600,
  },
  labelBgStyle: {
    fill: '#131c31',
    fillOpacity: 0.92,
  },
  labelBgPadding: [6, 3],
  labelBgBorderRadius: 5,
}

function serializeNodesForSave(nodes) {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type || 'infrastructure',
    position: {
      x: Math.round(node.position.x * 100) / 100,
      y: Math.round(node.position.y * 100) / 100,
    },
    data: { ...node.data },
  }))
}

function serializeEdgesForSave(edges) {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || null,
    targetHandle: edge.targetHandle || null,
    label: edge.label || '',
    type: edge.type || 'smoothstep',
    animated: edge.animated ?? true,
  }))
}

function DesignerCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [feedback, setFeedback] = useState(null)
  const [configuringNodeId, setConfiguringNodeId] = useState(null)

  // Phase 9.6 — Design persistence state
  const [activeDesignId, setActiveDesignId] = useState(null)
  const [designName, setDesignName] = useState('Untitled Architecture')
  const [designDescription, setDesignDescription] = useState('')
  const [savedDesigns, setSavedDesigns] = useState([])
  const [loadingDesigns, setLoadingDesigns] = useState(false)
  const [savingDesign, setSavingDesign] = useState(false)
  const [busyDesignId, setBusyDesignId] = useState(null)
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('save')
  const [modalError, setModalError] = useState('')

  const nextNodeId = useRef(1)
  const { fitView, screenToFlowPosition } = useReactFlow()

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message })
  }, [])

  const refreshSavedDesigns = useCallback(async () => {
    setLoadingDesigns(true)
    try {
      const list = await fetchDesigns()
      setSavedDesigns(list)
    } catch (err) {
      setModalError(err.message || 'Unable to load saved designs.')
    } finally {
      setLoadingDesigns(false)
    }
  }, [])

  useEffect(() => {
    refreshSavedDesigns()
  }, [refreshSavedDesigns])

  const filteredComponents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return COMPONENT_CATALOG.filter((component) => {
      const matchesCategory =
        activeCategory === 'All' ||
        component.category === activeCategory

      const matchesSearch =
        !query ||
        component.label.toLowerCase().includes(query) ||
        component.description.toLowerCase().includes(query) ||
        component.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  const addNode = useCallback(
    (component, position) => {
      const template =
        typeof component === 'string'
          ? COMPONENT_CATALOG.find((item) => item.id === component)
          : component

      if (!template) return

      const id = `${template.id}-${Date.now()}-${nextNodeId.current++}`
      const categoryUpper = template.category.toUpperCase()

      const newNode = {
        id,
        type: 'infrastructure',
        position: position || {
          x: 140 + (nodes.length % 4) * 65,
          y: 280 + (nodes.length % 5) * 55,
        },
        data: {
          label: template.label,
          category: categoryUpper,
          description: template.description,
          icon: template.icon,
          color: template.color,
          componentId: template.id,
          configured: false,
          config: getDefaultConfig(template.id, categoryUpper),
        },
      }

      setNodes((currentNodes) => [...currentNodes, newNode])
      setFeedback(null)
    },
    [nodes.length, setNodes],
  )

  const onDragStart = useCallback((event, component) => {
    event.dataTransfer.setData(
      'application/cloudlab-component',
      component.id,
    )
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const componentId = event.dataTransfer.getData(
        'application/cloudlab-component',
      )

      const component = COMPONENT_CATALOG.find(
        (item) => item.id === componentId,
      )

      if (!component) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(component, position)
    },
    [addNode, screenToFlowPosition],
  )

  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)

      const validation = validateConnection(sourceNode, targetNode)
      if (!validation.valid) {
        showFeedback('error', validation.reason)
        return
      }

      const duplicateExists = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target,
      )
      if (duplicateExists) {
        showFeedback('error', 'These two resources are already connected.')
        return
      }

      const newEdge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        label: validation.label,
      }

      setEdges((currentEdges) => addEdge(newEdge, currentEdges))
      showFeedback(
        'success',
        `Connected ${sourceNode.data.label} → ${targetNode.data.label} (${validation.label}).`,
      )
    },
    [edges, nodes, setEdges, showFeedback],
  )

  const duplicateSelected = useCallback(() => {
    setNodes((currentNodes) => {
      const selectedNodes = currentNodes.filter((node) => node.selected)

      if (!selectedNodes.length) return currentNodes

      const copies = selectedNodes.map((node) => ({
        ...node,
        id: `${node.id}-copy-${Date.now()}-${nextNodeId.current++}`,
        position: {
          x: node.position.x + 45,
          y: node.position.y + 45,
        },
        selected: false,
        data: {
          ...node.data,
          config: node.data.config ? { ...node.data.config } : undefined,
        },
      }))

      return [
        ...currentNodes.map((node) => ({
          ...node,
          selected: false,
        })),
        ...copies,
      ]
    })
  }, [setNodes])

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(
      nodes.filter((node) => node.selected).map((node) => node.id),
    )

    if (selectedNodeIds.has(configuringNodeId)) {
      setConfiguringNodeId(null)
    }

    if (selectedNodeIds.size > 0) {
      setNodes((currentNodes) =>
        currentNodes.filter((node) => !selectedNodeIds.has(node.id)),
      )
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) =>
            !edge.selected &&
            !selectedNodeIds.has(edge.source) &&
            !selectedNodeIds.has(edge.target),
        ),
      )
      return
    }

    setEdges((currentEdges) =>
      currentEdges.filter((edge) => !edge.selected),
    )
  }, [configuringNodeId, nodes, setEdges, setNodes])

  const handleSaveNodeConfig = useCallback(
    (nodeId, updatedData) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...updatedData,
                },
              }
            : node,
        ),
      )
      setConfiguringNodeId(null)
      showFeedback('success', `Updated configuration for ${updatedData.label}.`)
    },
    [setNodes, showFeedback],
  )

  // Phase 9.6 — Save, Load, Update, New & Delete handlers
  const openModal = useCallback(
    (tab) => {
      setModalTab(tab)
      setModalError('')
      setIsDesignModalOpen(true)
      refreshSavedDesigns()
    },
    [refreshSavedDesigns],
  )

  const handleSaveDesignSubmit = async (event, saveAsNew = false) => {
    if (event) event.preventDefault()

    const cleanName = designName.trim()
    if (!cleanName) {
      setModalError('Please enter a name for your infrastructure design.')
      return
    }

    setSavingDesign(true)
    setModalError('')

    const payload = {
      name: cleanName,
      description: designDescription.trim(),
      nodes: serializeNodesForSave(nodes),
      edges: serializeEdgesForSave(edges),
    }

    try {
      const saved =
        activeDesignId && !saveAsNew
          ? await updateDesign(activeDesignId, payload)
          : await createDesign(payload)

      setActiveDesignId(saved.id)
      setDesignName(saved.name)
      setDesignDescription(saved.description || '')
      setIsDesignModalOpen(false)
      await refreshSavedDesigns()
      showFeedback(
        'success',
        `${activeDesignId && !saveAsNew ? 'Updated' : 'Saved'} design "${saved.name}" (#${saved.id}) in PostgreSQL.`,
      )
    } catch (err) {
      setModalError(err.message || 'Failed to save infrastructure design.')
    } finally {
      setSavingDesign(false)
    }
  }

  const handleQuickSave = () => {
    if (activeDesignId) {
      handleSaveDesignSubmit(null, false)
    } else {
      openModal('save')
    }
  }

  const handleLoadDesign = async (designId) => {
    setBusyDesignId(designId)
    setModalError('')
    try {
      const design = await fetchDesignById(designId)
      const restoredNodes = (design.nodes || []).map((node) => ({
        ...node,
        type: node.type || 'infrastructure',
        selected: false,
      }))
      const restoredEdges = (design.edges || []).map((edge) => ({
        ...edge,
        selected: false,
      }))

      setConfiguringNodeId(null)
      setNodes(restoredNodes)
      setEdges(restoredEdges)
      setActiveDesignId(design.id)
      setDesignName(design.name)
      setDesignDescription(design.description || '')
      setIsDesignModalOpen(false)
      showFeedback(
        'success',
        `Loaded design "${design.name}" (${restoredNodes.length} nodes, ${restoredEdges.length} connections).`,
      )
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60)
    } catch (err) {
      setModalError(err.message || 'Failed to load infrastructure design.')
    } finally {
      setBusyDesignId(null)
    }
  }

  const handleDeleteSavedDesign = async (design) => {
    setBusyDesignId(design.id)
    setModalError('')
    try {
      await deleteDesign(design.id)
      if (activeDesignId === design.id) {
        setActiveDesignId(null)
      }
      await refreshSavedDesigns()
      showFeedback('success', `Deleted saved design "${design.name}".`)
    } catch (err) {
      setModalError(err.message || 'Failed to delete saved design.')
    } finally {
      setBusyDesignId(null)
    }
  }

  const handleStartNewDesign = () => {
    setConfiguringNodeId(null)
    setNodes(buildInitialNodes())
    setEdges([])
    setActiveDesignId(null)
    setDesignName('Untitled Architecture')
    setDesignDescription('')
    setIsDesignModalOpen(false)
    showFeedback('success', 'Started a fresh design canvas.')
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60)
  }

  const selectedNodes = nodes.filter((node) => node.selected)
  const selectedEdges = edges.filter((edge) => edge.selected)
  const selectedCount = selectedNodes.length
  const selectedEdgeCount = selectedEdges.length
  const hasSelection = selectedCount > 0 || selectedEdgeCount > 0

  const configuringNode = useMemo(
    () => nodes.find((node) => node.id === configuringNodeId) || null,
    [configuringNodeId, nodes],
  )

  const openConfigureForSelected = useCallback(() => {
    if (selectedNodes.length === 1) {
      setConfiguringNodeId(selectedNodes[0].id)
    }
  }, [selectedNodes])

  return (
    <div className="designer-page">
      <header className="designer-topbar">
        <div className="designer-brand">
          <a href="/" className="designer-back" aria-label="Back to dashboard">
            ←
          </a>

          <div className="designer-brand-mark">C</div>

          <div>
            <strong>CloudLab</strong>
            <span>Infrastructure Designer</span>
          </div>
        </div>

        <div className="designer-topbar-center">
          <span className="designer-live-dot" />
          <span>{designName}</span>
          {activeDesignId ? (
            <span className="design-id-pill">Saved #{activeDesignId}</span>
          ) : (
            <span className="design-id-pill unsaved">Unsaved draft</span>
          )}
        </div>

        <div className="designer-topbar-actions">
          <button
            type="button"
            className="canvas-action secondary"
            onClick={handleStartNewDesign}
            title="Start a new design"
          >
            New
          </button>

          <button
            type="button"
            className="canvas-action secondary"
            onClick={() => openModal('load')}
            title="Browse and load saved designs"
          >
            Load ({savedDesigns.length})
          </button>

          <button
            type="button"
            className="canvas-action primary"
            onClick={handleQuickSave}
            disabled={savingDesign}
            title="Save design to PostgreSQL"
          >
            {savingDesign ? 'Saving...' : activeDesignId ? 'Save' : 'Save Design'}
          </button>

          {activeDesignId && (
            <button
              type="button"
              className="canvas-action secondary"
              onClick={() => openModal('save')}
              title="Edit name/description or save a copy"
            >
              Save As
            </button>
          )}

          <a href="/" className="dashboard-link">
            Overview
          </a>
        </div>
      </header>

      <div className="designer-workspace">
        <aside className="designer-sidebar">
          <div className="designer-sidebar-heading">
            <span>CANVAS TOOLS</span>
            <span className="tool-count">{nodes.length}</span>
          </div>

          <div className="designer-tool-section component-library">
            <div className="library-heading">
              <div>
                <h3>Component Library</h3>
                <p>Search, select or drag resources onto the canvas.</p>
              </div>

              <span className="library-total">
                {COMPONENT_CATALOG.length}
              </span>
            </div>

            <label className="library-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search infrastructure components"
              />
            </label>

            <div className="library-categories" aria-label="Component categories">
              {COMPONENT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-filter ${
                    activeCategory === category ? 'active' : ''
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="library-results" aria-live="polite">
              <div className="library-results-heading">
                <span>
                  {activeCategory === 'All' ? 'ALL RESOURCES' : activeCategory.toUpperCase()}
                </span>
                <span>{filteredComponents.length} items</span>
              </div>

              {filteredComponents.length > 0 ? (
                filteredComponents.map((component) => (
                  <button
                    key={component.id}
                    className="component-tool"
                    type="button"
                    draggable
                    onClick={() => addNode(component)}
                    onDragStart={(event) => onDragStart(event, component)}
                    title={`Add or drag ${component.label} to the canvas`}
                  >
                    <span className={`tool-icon ${component.color}`}>
                      {component.icon}
                    </span>

                    <span>
                      <strong>{component.label}</strong>
                      <small>{component.description}</small>
                    </span>

                    <span className="tool-plus">+</span>
                  </button>
                ))
              ) : (
                <div className="library-empty">
                  <span>⌕</span>
                  <strong>No components found</strong>
                  <small>Try another search or category.</small>
                </div>
              )}
            </div>
          </div>

          <div className="designer-sidebar-section">
            <h3>Canvas information</h3>

            <div className="canvas-info-row">
              <span>Components</span>
              <strong>{nodes.length}</strong>
            </div>

            <div className="canvas-info-row">
              <span>Connections</span>
              <strong>{edges.length}</strong>
            </div>

            <div className="canvas-info-row">
              <span>Saved Designs</span>
              <strong>{savedDesigns.length}</strong>
            </div>

            <div className="canvas-info-row">
              <span>Selected</span>
              <strong>
                {selectedCount > 0
                  ? `${selectedCount} node${selectedCount > 1 ? 's' : ''}`
                  : selectedEdgeCount > 0
                    ? `${selectedEdgeCount} link${selectedEdgeCount > 1 ? 's' : ''}`
                    : '0'}
              </strong>
            </div>
          </div>

          <div className="designer-sidebar-note">
            <span>ⓘ</span>
            <p>
              Use Save Design and Load in the top bar to persist your
              architecture in PostgreSQL across sessions.
            </p>
          </div>
        </aside>

        <main className="designer-main">
          <div className="canvas-heading">
            <div>
              <div className="canvas-eyebrow">VISUAL WORKSPACE</div>
              <h1>Infrastructure Canvas</h1>
              <p>Connect, configure, and persist your cloud architecture.</p>
            </div>

            <div className="canvas-actions">
              <button
                type="button"
                className="canvas-action secondary"
                onClick={openConfigureForSelected}
                disabled={selectedCount !== 1}
                title="Select a single resource to configure"
              >
                Configure
              </button>

              <button
                type="button"
                className="canvas-action secondary"
                onClick={duplicateSelected}
                disabled={selectedCount === 0}
              >
                Duplicate
              </button>

              <button
                type="button"
                className="canvas-action danger"
                onClick={deleteSelected}
                disabled={!hasSelection}
              >
                Delete
              </button>

              <button
                type="button"
                className="canvas-action primary"
                onClick={() => fitView({ padding: 0.2, duration: 300 })}
              >
                Fit view
              </button>
            </div>
          </div>

          {feedback && (
            <div className={`canvas-feedback ${feedback.type}`} role="status">
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          <div className="canvas-workspace-body">
            <div
              className="canvas-container"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.5}
                nodesConnectable
                nodesDraggable
                elementsSelectable
                deleteKeyCode={['Delete', 'Backspace']}
                panOnDrag
                zoomOnScroll
                selectionOnDrag={false}
                proOptions={{ hideAttribution: false }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={22}
                  size={1}
                  color="#35405b"
                />

                <Controls
                  showInteractive={false}
                  position="bottom-left"
                />

                <MiniMap
                  position="bottom-right"
                  pannable
                  zoomable
                  nodeColor={(node) => {
                    const colors = {
                      purple: '#8b7cff',
                      blue: '#54a9ef',
                      green: '#35d39a',
                      orange: '#f6a65c',
                      cyan: '#4dc9d9',
                      red: '#ff8992',
                    }

                    return colors[node.data?.color] || '#8b7cff'
                  }}
                  maskColor="rgba(8, 13, 25, 0.72)"
                />

                <Panel position="top-left" className="canvas-hint">
                  Drag from node handles to connect · Click Save Design to persist
                </Panel>
              </ReactFlow>
            </div>

            {configuringNode && (
              <ConfigurationPanel
                node={configuringNode}
                onSave={handleSaveNodeConfig}
                onClose={() => setConfiguringNodeId(null)}
              />
            )}
          </div>

          <div className="canvas-footer">
            <span>
              <span className="designer-live-dot" />
              Canvas ready · {edges.length} connection{edges.length === 1 ? '' : 's'}
            </span>
            <span>Connect · Configure · Save · Load</span>
            <span>Phase 9.6 · Design Persistence</span>
          </div>
        </main>
      </div>

      {isDesignModalOpen && (
        <div
          className="design-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Infrastructure Design Manager"
        >
          <div className="design-modal">
            <div className="design-modal-header">
              <div>
                <span className="config-eyebrow">POSTGRESQL PERSISTENCE</span>
                <h3>Infrastructure Design Manager</h3>
              </div>
              <button
                type="button"
                className="config-close-btn"
                onClick={() => setIsDesignModalOpen(false)}
                aria-label="Close design manager"
              >
                ✕
              </button>
            </div>

            <div className="design-modal-tabs">
              <button
                type="button"
                className={`design-tab ${modalTab === 'save' ? 'active' : ''}`}
                onClick={() => {
                  setModalTab('save')
                  setModalError('')
                }}
              >
                Save Design
              </button>
              <button
                type="button"
                className={`design-tab ${modalTab === 'load' ? 'active' : ''}`}
                onClick={() => {
                  setModalTab('load')
                  setModalError('')
                  refreshSavedDesigns()
                }}
              >
                Saved Designs ({savedDesigns.length})
              </button>
            </div>

            {modalError && <div className="config-error">{modalError}</div>}

            {modalTab === 'save' ? (
              <form
                className="design-modal-body"
                onSubmit={(event) => handleSaveDesignSubmit(event, false)}
              >
                <label className="config-field">
                  <span>Design Name *</span>
                  <input
                    type="text"
                    value={designName}
                    onChange={(event) => setDesignName(event.target.value)}
                    placeholder="e.g., Production AWS 3-Tier Web Stack"
                    maxLength={120}
                  />
                </label>

                <label className="config-field">
                  <span>Description</span>
                  <input
                    type="text"
                    value={designDescription}
                    onChange={(event) => setDesignDescription(event.target.value)}
                    placeholder="Optional notes about this cloud architecture"
                    maxLength={1000}
                  />
                </label>

                <div className="design-save-summary">
                  <span>Nodes: <strong>{nodes.length}</strong></span>
                  <span>Connections: <strong>{edges.length}</strong></span>
                  <span>
                    Target: <strong>{activeDesignId ? `Design #${activeDesignId}` : 'New record'}</strong>
                  </span>
                </div>

                <div className="config-actions">
                  <button
                    type="button"
                    className="canvas-action secondary"
                    onClick={() => setIsDesignModalOpen(false)}
                  >
                    Cancel
                  </button>

                  {activeDesignId && (
                    <button
                      type="button"
                      className="canvas-action secondary"
                      disabled={savingDesign}
                      onClick={() => handleSaveDesignSubmit(null, true)}
                    >
                      Save as New Copy
                    </button>
                  )}

                  <button
                    type="submit"
                    className="canvas-action primary"
                    disabled={savingDesign}
                  >
                    {savingDesign
                      ? 'Saving...'
                      : activeDesignId
                        ? 'Update Design'
                        : 'Save Design'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="design-modal-body">
                {loadingDesigns ? (
                  <p className="design-empty-state">Loading saved designs...</p>
                ) : savedDesigns.length === 0 ? (
                  <p className="design-empty-state">
                    No saved infrastructure designs yet. Switch to Save Design to store your first architecture.
                  </p>
                ) : (
                  <div className="saved-design-list">
                    {savedDesigns.map((item) => (
                      <div
                        key={item.id}
                        className={`saved-design-card ${
                          activeDesignId === item.id ? 'active' : ''
                        }`}
                      >
                        <div className="saved-design-meta">
                          <div className="saved-design-title">
                            <strong>{item.name}</strong>
                            <span className="design-id-pill">#{item.id}</span>
                          </div>
                          {item.description && <p>{item.description}</p>}
                          <small>
                            {item.node_count} nodes · {item.edge_count} connections · Updated{' '}
                            {new Date(item.updated_at).toLocaleString()}
                          </small>
                        </div>

                        <div className="saved-design-actions">
                          <button
                            type="button"
                            className="canvas-action primary"
                            disabled={busyDesignId === item.id}
                            onClick={() => handleLoadDesign(item.id)}
                          >
                            {busyDesignId === item.id ? 'Loading...' : 'Load'}
                          </button>

                          <button
                            type="button"
                            className="canvas-action danger"
                            disabled={busyDesignId === item.id}
                            onClick={() => handleDeleteSavedDesign(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfrastructureDesigner() {
  return (
    <ReactFlowProvider>
      <DesignerCanvas />
    </ReactFlowProvider>
  )
}

export default InfrastructureDesigner
