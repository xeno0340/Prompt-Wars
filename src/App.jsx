import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'

import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Leaderboard from './pages/Leaderboard'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen circuit-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-display font-black mb-4">
            <span className="neon-text">PROMPT</span>{' '}
            <span className="gold-text">WARS</span>
          </h1>
          <div className="loading-dots justify-center">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/register'} replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Router>
  )
}

export default App