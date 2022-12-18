import { MemoryRouter as Router, Routes, Route } from 'react-router-dom'
import HealthDashboard from './components/HealthDashboard'
import './App.css'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HealthDashboard />} />
      </Routes>
    </Router>
  )
}
