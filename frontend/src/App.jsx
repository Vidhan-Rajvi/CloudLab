import { useCallback, useEffect, useState } from 'react'
import {
  fetchRoot,
  fetchReadiness,
  fetchLiveness,
} from './services/api'
import InfrastructureDesigner from './pages/InfrastructureDesigner'
import './App.css'

const navigation = [
  { icon: '◈', label: 'Overview', active: true },
  { icon: '▦', label: 'Infrastructure Designer', tag: '9.3' },
  { icon: '⌁', label: 'Simulations', tag: 'Soon' },
  { icon: '⇧', label: 'Deployments', tag: 'Soon' },
  { icon: '◉', label: 'Monitoring', tag: 'Soon' },
]

function StatusIndicator({ status }) {
  const isHealthy = status === 'connected' || status === 'alive'

  return (
    <span className={`status-indicator ${isHealthy ? 'healthy' : 'unhealthy'}`}>
      <span className="status-dot" />
      {isHealthy ? 'Operational' : 'Unavailable'}
    </span>
  )
}

function Dashboard() {
  const [root, setRoot] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [liveness, setLiveness] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadDashboard = useCallback(async () => {
    setRefreshing(true)

    const results = await Promise.allSettled([
      fetchRoot(),
      fetchReadiness(),
      fetchLiveness(),
    ])

    const nextErrors = {}

    if (results[0].status === 'fulfilled') {
      setRoot(results[0].value)
    } else {
      setRoot(null)
      nextErrors.root = results[0].reason.message
    }

    if (results[1].status === 'fulfilled') {
      setReadiness(results[1].value)
    } else {
      setReadiness(null)
      nextErrors.readiness = results[1].reason.message
    }

    if (results[2].status === 'fulfilled') {
      setLiveness(results[2].value)
    } else {
      setLiveness(null)
      nextErrors.liveness = results[2].reason.message
    }

    setErrors(nextErrors)
    setLastUpdated(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const checks = Object.entries(readiness?.checks || {})
  const connectedCount = checks.filter(
    ([, check]) => check.status === 'connected',
  ).length

  const apiAlive = liveness?.status === 'alive'
  const platformReady = readiness?.status === 'ready'

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div className="brand-copy">
            <strong>CloudLab</strong>
            <span>Cloud workspace</span>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">CL</div>
          <div className="workspace-copy">
            <span>Workspace</span>
            <strong>My CloudLab</strong>
          </div>
          <span className="workspace-chevron">⌄</span>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const className = `nav-item ${item.active ? 'active' : ''}`

            const content = (
              <>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.tag && <span className="nav-tag">{item.tag}</span>}
              </>
            )

            if (item.label === 'Infrastructure Designer') {
              return (
                <a
                  href="/designer"
                  className={className}
                  key={item.label}
                  title="Open Infrastructure Designer"
                >
                  {content}
                </a>
              )
            }

            return (
              <div className={className} key={item.label}>
                {content}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-section-label">PLATFORM</div>
          <div className="nav-item">
            <span className="nav-icon">⚙</span>
            <span className="nav-label">Settings</span>
            <span className="nav-tag">Soon</span>
          </div>

          <div className="sidebar-profile">
            <div className="profile-avatar">CL</div>
            <div className="profile-copy">
              <strong>CloudLab User</strong>
              <span>Personal workspace</span>
            </div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Overview</strong>
          </div>

          <div className="topbar-actions">
            <span className="environment-label">
              <span className="environment-dot" />
              Development environment
            </span>

            <button
              className="refresh-button"
              onClick={loadDashboard}
              disabled={refreshing}
              type="button"
            >
              <span className={refreshing ? 'refresh-symbol spinning' : 'refresh-symbol'}>
                ↻
              </span>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">CLOUD INFRASTRUCTURE WORKSPACE</div>
              <h1>Welcome to CloudLab<span>.</span></h1>
              <p>
                Design, understand, simulate and manage your cloud
                infrastructure from one workspace.
              </p>
            </div>

            <div className="welcome-status">
              <span className={`large-status-dot ${platformReady ? 'online' : 'offline'}`} />
              <div>
                <strong>
                  {loading
                    ? 'Checking platform'
                    : platformReady
                      ? 'Platform operational'
                      : 'Platform needs attention'}
                </strong>
                <span>
                  {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString()}`
                    : 'Waiting for first health check'}
                </span>
              </div>
            </div>
          </section>

          <section className="overview-grid" aria-label="Platform overview">
            <article className="overview-card">
              <div className="card-topline">
                <span className="card-icon purple">⌘</span>
                <span className="card-kicker">BACKEND API</span>
              </div>
              <div className="card-main-value">
                {loading ? 'Checking...' : apiAlive ? 'Online' : 'Offline'}
              </div>
              <div className="card-description">
                {root?.version
                  ? `Version ${root.version}`
                  : root
                    ? 'API responded successfully'
                    : 'Waiting for API response'}
              </div>
              <div className="card-footer">
                <StatusIndicator status={apiAlive ? 'alive' : 'unavailable'} />
              </div>
            </article>

            <article className="overview-card">
              <div className="card-topline">
                <span className="card-icon blue">▤</span>
                <span className="card-kicker">CONNECTED SERVICES</span>
              </div>
              <div className="card-main-value">
                {loading ? '—' : `${connectedCount}/${checks.length}`}
              </div>
              <div className="card-description">
                Backend dependency checks
              </div>
              <div className="card-footer">
                <span className="neutral-label">
                  {checks.length ? 'Live health information' : 'No health data'}
                </span>
              </div>
            </article>

            <article className="overview-card">
              <div className="card-topline">
                <span className="card-icon green">◉</span>
                <span className="card-kicker">DATABASE</span>
              </div>
              <div className="card-main-value">
                {loading
                  ? 'Checking...'
                  : readiness?.checks?.postgres?.status === 'connected'
                    ? 'Connected'
                    : 'Unavailable'}
              </div>
              <div className="card-description">
                PostgreSQL database
              </div>
              <div className="card-footer">
                <StatusIndicator
                  status={readiness?.checks?.postgres?.status || 'unavailable'}
                />
              </div>
            </article>

            <article className="overview-card">
              <div className="card-topline">
                <span className="card-icon orange">⚡</span>
                <span className="card-kicker">CACHE SERVICE</span>
              </div>
              <div className="card-main-value">
                {loading
                  ? 'Checking...'
                  : readiness?.checks?.redis?.status === 'connected'
                    ? 'Connected'
                    : 'Unavailable'}
              </div>
              <div className="card-description">
                Redis cache and queue service
              </div>
              <div className="card-footer">
                <StatusIndicator
                  status={readiness?.checks?.redis?.status || 'unavailable'}
                />
              </div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel service-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-eyebrow">INFRASTRUCTURE</div>
                  <h2>Platform services</h2>
                  <p>Live dependency health reported by your backend.</p>
                </div>
                <span className="live-label">
                  <span className="environment-dot" />
                  Live status
                </span>
              </div>

              {errors.readiness && (
                <div className="error-message">
                  Unable to retrieve service health: {errors.readiness}
                </div>
              )}

              {loading ? (
                <div className="empty-state">Checking platform services...</div>
              ) : checks.length > 0 ? (
                <div className="service-list">
                  {checks.map(([name, check]) => (
                    <div className="service-row" key={name}>
                      <div className="service-symbol">
                        {name === 'postgres' ? '▤' : name === 'redis' ? '⚡' : '◈'}
                      </div>

                      <div className="service-details">
                        <strong>
                          {name === 'postgres'
                            ? 'PostgreSQL'
                            : name === 'redis'
                              ? 'Redis'
                              : name.replaceAll('_', ' ')}
                        </strong>
                        <span>
                          {typeof check.duration_ms === 'number'
                            ? `Response time: ${check.duration_ms} ms`
                            : 'Backend dependency'}
                        </span>
                      </div>

                      <StatusIndicator status={check.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  Service information is currently unavailable.
                </div>
              )}

              <div className="panel-bottom-note">
                <span>Source: FastAPI readiness endpoint</span>
                <span>{checks.length} checks</span>
              </div>
            </article>

            <article className="panel getting-started-panel">
              <div className="panel-eyebrow">YOUR WORKSPACE</div>
              <h2>Build something great.</h2>
              <p>
                CloudLab is being developed as a visual cloud infrastructure
                learning and management platform.
              </p>

              <div className="roadmap-card">
                <div className="roadmap-icon">◈</div>
                <div>
                  <strong>Visual Infrastructure Designer</strong>
                  <span>Drag, connect and configure cloud resources.</span>
                </div>
                <span className="coming-tag">Phase 9.3</span>
              </div>

              <div className="roadmap-card">
                <div className="roadmap-icon">⌁</div>
                <div>
                  <strong>Infrastructure Simulation</strong>
                  <span>Explore and validate infrastructure designs.</span>
                </div>
                <span className="coming-tag">Planned</span>
              </div>

              <div className="roadmap-card">
                <div className="roadmap-icon">✧</div>
                <div>
                  <strong>AI Infrastructure Analysis</strong>
                  <span>Get intelligent recommendations for your designs.</span>
                </div>
                <span className="coming-tag">Planned</span>
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel platform-message">
              <div className="message-icon">✦</div>
              <div>
                <h3>One workspace for your cloud journey.</h3>
                <p>
                  From infrastructure design to deployment and monitoring,
                  CloudLab brings your cloud workflow together.
                </p>
              </div>
            </article>

            <article className="panel api-panel">
              <div>
                <div className="panel-eyebrow">DEVELOPER RESOURCE</div>
                <h3>Backend API documentation</h3>
                <p>Explore the available FastAPI endpoints.</p>
              </div>
              <a href="/api/docs" target="_blank" rel="noreferrer">
                Open API docs ↗
              </a>
            </article>
          </section>

          {errors.root && (
            <div className="error-message">
              Backend information: {errors.root}
            </div>
          )}

          {errors.liveness && (
            <div className="error-message">
              API health: {errors.liveness}
            </div>
          )}

          <footer className="dashboard-footer">
            <span>CloudLab · Visual Cloud Infrastructure Platform</span>
            <span>Development workspace · Phase 9.2</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function App() {
  const isDesigner = window.location.pathname === '/designer'

  return isDesigner ? <InfrastructureDesigner /> : <Dashboard />
}

export default App
