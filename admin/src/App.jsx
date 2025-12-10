import React, { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import TVs from './components/TVs'
import Videos from './components/Videos'
import Schedules from './components/Schedules'
import LiveView from './components/LiveView'
import { FaEye } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

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
            <button 
              className={activeTab === 'liveview' ? 'active' : ''}
              onClick={() => setActiveTab('liveview')}
            >
              <FaEye /> Vista en Vivo
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
      </main>
    </div>
  )
}

export default App

