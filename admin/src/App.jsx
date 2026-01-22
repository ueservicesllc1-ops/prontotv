import React, { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import TVs from './components/TVs'
import Videos from './components/Videos'
import Schedules from './components/Schedules'
import LiveView from './components/LiveView'
import Users from './components/Users'
import Login from './components/Login'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { FaEye, FaSignOutAlt, FaUsers } from 'react-icons/fa'
import { useUserRole } from './hooks/useUserRole'

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

  // Get user role
  const { role, loading: roleLoading, isAdmin } = useUserRole(user)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading || roleLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1a1a2e', color: 'white' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  if (!user) {
    return <Login />;
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
            {/* Playlists button removed as it's integrated in Schedules */}
            <button
              className={activeTab === 'liveview' ? 'active' : ''}
              onClick={() => setActiveTab('liveview')}
            >
              <FaEye /> Vista en Vivo
            </button>

            {/* Show Users tab only for admins and super admins */}
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
              title="Cerrar Sesión"
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
        {activeTab === 'users' && isAdmin && <Users />}
      </main>
    </div>
  )
}

export default App

