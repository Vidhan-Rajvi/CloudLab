import { useState, useEffect } from 'react'
import { fetchStatus } from './services/api'
import './App.css'

function App() {
  const [apiData, setApiData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      try {
        const data = await fetchStatus()
        setApiData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  return (
    <div className="app-container">
      <div className="hero-section">
        <h1 className="title">CloudLab</h1>
        <p className="tagline">
          The next-generation cloud experimentation platform. <br />
          Build, test, and scale your infrastructure with confidence.
        </p>

        <div className="status-card">
          <div className="status-item">
            <span className="status-label">API Connection</span>
            {loading ? (
              <span className="status-value">Connecting...</span>
            ) : error ? (
              <div className="indicator disconnected">
                <div className="pulse disconnected"></div>
                Disconnected
              </div>
            ) : (
              <div className="indicator connected">
                <div className="pulse connected"></div>
                Backend Connected
              </div>
            )}
          </div>

          <div className="status-item">
            <span className="status-label">Version</span>
            <span className="status-value">{apiData?.version || '---'}</span>
          </div>

          <div className="status-item">
            <span className="status-label">System Message</span>
            <span className="status-value" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              {apiData?.message || (error ? error : '...')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
