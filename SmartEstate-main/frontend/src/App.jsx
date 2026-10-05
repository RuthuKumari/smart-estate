import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Predict from './pages/Predict.jsx'
import Neighborhood from './pages/Neighborhood.jsx'
import Compare from './pages/Compare.jsx'
import Advisor from './pages/Advisor.jsx'
import Chat from './pages/Chat.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/neighborhood" element={<Neighborhood />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboard title="Model Dashboard" phase="Phase 2b" />} />
        </Routes>
      </main>
    </div>
  )
}