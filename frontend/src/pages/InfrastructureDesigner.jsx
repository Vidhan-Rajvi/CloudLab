import { useCallback, useMemo, useRef, useState } from 'react'
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
import './InfrastructureDesigner.css'

const initialNodes = [
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

const initialEdges = []

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

function DesignerCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [feedback, setFeedback] = useState(null)
  const [configuringNodeId, setConfiguringNodeId] = useState(null)

  const nextNodeId = useRef(1)
  const { fitView, screenToFlowPosition } = useReactFlow()

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message })
  }, [])

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
          Local design workspace
        </div>

        <a href="/" className="dashboard-link">
          Overview
        </a>
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
              Drag from a blue/purple handle to connect resources. Select a
              node and click Configure to edit its properties.
            </p>
          </div>
        </aside>

        <main className="designer-main">
          <div className="canvas-heading">
            <div>
              <div className="canvas-eyebrow">VISUAL WORKSPACE</div>
              <h1>Infrastructure Canvas</h1>
              <p>Connect and configure your cloud resources visually.</p>
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
                  Drag from node handles to connect · Select a node to configure
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
            <span>Connect · Configure · Validate · Zoom</span>
            <span>Phase 9.5 · Connections & Configuration</span>
          </div>
        </main>
      </div>
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
