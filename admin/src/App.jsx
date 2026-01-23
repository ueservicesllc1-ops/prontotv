import React, { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import TVs from './components/TVs'
import Videos from './components/Videos'
import Schedules from './components/Schedules'
import LiveView from './components/LiveView'
import Users from './components/Users'
import Login from './components/Login'
import { FaEye, FaUsers, FaSignOutAlt } from 'react-icons/fa'

// Detectar automáticamente la URL del servidor basándose en la URL actual
function getApiUrl() {
  // Si hay una variable de entorno configurada, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // Si estamos en localhost, usar localhost:3000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api'
  }

  // Si estamos en producción, usar la misma URL base pero con /api
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ''
  return `${protocol}//${hostname}${port}/api`
}

const API_URL = (function () {
  const url = getApiUrl()
  console.log('🌐 Admin - URL del servidor detectada:', url)
  return url
})()

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verificar sesión al cargar
  useEffect(() => {
    const savedUser = localStorage.getItem('prontotvUser')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error('Error parsing saved user:', e)
        localStorage.removeItem('prontotvUser')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('prontotvUser')
    setUser(null)
    setActiveTab('dashboard')
  }

  // Verificar si el usuario es admin o super admin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1a1a2e', color: 'white' }}>
        <h2>Cargando...</h2>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <header className="app-header" style={{ background: '#F58342', backgroundColor: '#F58342' }}>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="ProntoTV"
              style={{
                height: '60px',
                width: 'auto',
                filter: 'brightness(0) invert(1)',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.warn('Logo no encontrado, ocultando imagen');
                e.target.style.display = 'none';
              }}
            />
            <h1 style={{ margin: 0 }}>ProntoTV Admin</h1>
          </div>

          {/* Usuario logueado */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            marginLeft: 'auto',
            marginRight: '20px'
          }}>
            <span style={{
              fontSize: '20px'
            }}>
              {user.role === 'superadmin' ? '👑' : user.role === 'admin' ? '🛡️' : '✏️'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {user.name || user.username}
              </span>
              <span style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Administrador' : 'Editor'}
              </span>
            </div>
          </div>

          <nav className="nav-tabs">
            <button
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={activeTab === 'tvs' ? 'active' : ''}
              onClick={() => setActiveTab('tvs')}
            >
              TVs
            </button>
            <button
              className={activeTab === 'videos' ? 'active' : ''}
              onClick={() => setActiveTab('videos')}
            >
              Videos
            </button>
            <button
              className={activeTab === 'schedules' ? 'active' : ''}
              onClick={() => setActiveTab('schedules')}
            >
              Programación
            </button>
            <button
              className={activeTab === 'liveview' ? 'active' : ''}
              onClick={() => setActiveTab('liveview')}
            >
              <FaEye /> Vista en Vivo
            </button>

            {/* Solo mostrar Usuarios para admins y super admins */}
            {isAdmin && (
              <button
                className={activeTab === 'users' ? 'active' : ''}
                onClick={() => setActiveTab('users')}
              >
                <FaUsers /> Usuarios
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{ marginLeft: '20px', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white' }}
              title={`Cerrar Sesión (${user.name || user.username})`}
            >
              <FaSignOutAlt /> Salir
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard apiUrl={API_URL} />}
        {activeTab === 'tvs' && <TVs apiUrl={API_URL} />}
        {activeTab === 'videos' && <Videos apiUrl={API_URL} />}
        {activeTab === 'schedules' && <Schedules apiUrl={API_URL} />}
        {activeTab === 'liveview' && <LiveView apiUrl={API_URL} />}
        {activeTab === 'users' && isAdmin && <Users currentUser={user} />}
      </main>
    </div>
  )
}

export default App

