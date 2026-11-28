import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import InfrastructureNode from '../components/InfrastructureNode'
import {
  COMPONENT_CATALOG,
  COMPONENT_CATEGORIES,
} from '../data/componentCatalog'
import './InfrastructureDesigner.css'

const initialNodes = [
  {
    id: 'cloud-1',
    type: 'infrastructure',
    position: { x: 100, y: 100 },
    data: {
      label: 'Cloud Environment',
      category: 'CLOUD',
      description: 'Cloud infrastructure boundary',
      icon: '☁',
      color: 'purple',
    },
  },
  {
    id: 'compute-1',
    type: 'infrastructure',
    position: { x: 420, y: 100 },
    data: {
      label: 'Compute Instance',
      category: 'COMPUTE',
      description: 'Virtual server resource',
      icon: '▣',
      color: 'blue',
    },
  },
  {
    id: 'database-1',
    type: 'infrastructure',
    position: { x: 740, y: 100 },
    data: {
      label: 'Database',
      category: 'DATABASE',
      description: 'Data storage resource',
      icon: '▤',
      color: 'green',
    },
  },
]

const nodeTypes = {
  infrastructure: InfrastructureNode,
}

function DesignerCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const nextNodeId = useRef(1)

  const { fitView, screenToFlowPosition } = useReactFlow()

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

      const newNode = {
        id,
        type: 'infrastructure',
        position: position || {
          x: 140 + (nodes.length % 4) * 65,
          y: 260 + (nodes.length % 5) * 55,
        },
        data: {
          label: template.label,
          category: template.category.toUpperCase(),
          description: template.description,
          icon: template.icon,
          color: template.color,
          componentId: template.id,
        },
      }

      setNodes((currentNodes) => [...currentNodes, newNode])
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
        data: { ...node.data },
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
    setNodes((currentNodes) =>
      currentNodes.filter((node) => !node.selected),
    )
  }, [setNodes])

  const selectedCount = nodes.filter((node) => node.selected).length

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
              <span>Selected</span>
              <strong>{selectedCount}</strong>
            </div>

            <div className="canvas-info-row">
              <span>Connections</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="designer-sidebar-note">
            <span>ⓘ</span>
            <p>
              This is a local canvas prototype. Connections and persistent
              saving will be introduced in later phases.
            </p>
          </div>
        </aside>

        <main className="designer-main">
          <div className="canvas-heading">
            <div>
              <div className="canvas-eyebrow">VISUAL WORKSPACE</div>
              <h1>Infrastructure Canvas</h1>
              <p>Arrange your cloud resources visually.</p>
            </div>

            <div className="canvas-actions">
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
                disabled={selectedCount === 0}
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

          <div
            className="canvas-container"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <ReactFlow
              nodes={nodes}
              onNodesChange={onNodesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={1.5}
              nodesConnectable={false}
              nodesDraggable
              elementsSelectable
              deleteKeyCode="Delete"
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
                  }

                  return colors[node.data?.color] || '#8b7cff'
                }}
                maskColor="rgba(8, 13, 25, 0.72)"
              />

              <Panel position="top-left" className="canvas-hint">
                Drag nodes to arrange your infrastructure
              </Panel>
            </ReactFlow>
          </div>

          <div className="canvas-footer">
            <span>
              <span className="designer-live-dot" />
              Canvas ready
            </span>
            <span>Drag · Select · Move · Zoom</span>
            <span>Phase 9.4 · Component Library</span>
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
