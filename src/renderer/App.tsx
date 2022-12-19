import { MemoryRouter as Router, Routes, Route } from 'react-router-dom'
import GenericDashboard from './components/HealthDashboard'
import WebSocketMonitor from './components/WebSocketMonitor'

import './App.css'
import { useState } from 'react'

const Dashboard = () => {
  const [usingWS, setUsingWS] = useState(true)
  return (
    <div className="health-dashboard">
      <h1>Network Monitor</h1>
      <p className="dashboard-switch" onClick={() => setUsingWS(!usingWS)}>
        <small>Switch to {usingWS ? 'generic' : 'websocket'} dashboard</small>
      </p>
      {usingWS ? <WebSocketMonitor /> : <GenericDashboard />}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}
