import React, { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import TVs from './components/TVs'
import Videos from './components/Videos'
import Schedules from './components/Schedules'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="app">
      <header className="app-header" style={{ background: '#F58342', backgroundColor: '#F58342' }}>
        <div className="header-content">
          <h1>📺 ProntoTV Admin</h1>
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
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard apiUrl={API_URL} />}
        {activeTab === 'tvs' && <TVs apiUrl={API_URL} />}
        {activeTab === 'videos' && <Videos apiUrl={API_URL} />}
        {activeTab === 'schedules' && <Schedules apiUrl={API_URL} />}
      </main>
    </div>
  )
}

export default App

