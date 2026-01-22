import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaVideo, FaCalendar, FaCheck } from 'react-icons/fa'
import './Dashboard.css'

function Dashboard({ apiUrl }) {
  const [stats, setStats] = useState({
    totalTVs: 0,
    onlineTVs: 0,
    totalVideos: 0,
    activeSchedules: 0
  })
  const [recentTVs, setRecentTVs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTV, setEditingTV] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000) // Actualizar cada 15 segundos
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      // Agregar timeout a las peticiones
      const timeout = 15000; // 15 segundos

      const [tvsRes, videosRes, schedulesRes] = await Promise.all([
        axios.get(`${apiUrl}/tvs`, { timeout }),
        axios.get(`${apiUrl}/videos`, { timeout }),
        axios.get(`${apiUrl}/schedules`, { timeout })
      ])

      const tvs = tvsRes.data || []
      const onlineTVs = tvs.filter(tv => tv.status === 'online')

      setStats({
        totalTVs: tvs.length,
        onlineTVs: onlineTVs.length,
        totalVideos: (videosRes.data || []).length,
        activeSchedules: (schedulesRes.data || []).filter(s => s.is_active).length
      })

      setRecentTVs(tvs.slice(0, 5))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Establecer valores por defecto en caso de error
      setStats({
        totalTVs: 0,
        onlineTVs: 0,
        totalVideos: 0,
        activeSchedules: 0
      })
      setRecentTVs([])
      setLoading(false)
    }
  }

  const handleEditName = (tv) => {
    setEditingTV(tv.id)
    setEditName(tv.name)
  }

  const handleSaveName = async (tvId) => {
    try {
      await axios.patch(`${apiUrl}/tvs/${tvId}`, { name: editName })
      setEditingTV(null)
      fetchData() // Refrescar datos
    } catch (error) {
      console.error('Error updating TV name:', error)
      alert('Error al actualizar el nombre')
    }
  }

  const handleCancelEdit = () => {
    setEditingTV(null)
    setEditName('')
  }

  if (loading) {
    return <div className="card">Cargando...</div>
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📺</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTVs}</div>
            <div className="stat-label">Total TVs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.onlineTVs}</div>
            <div className="stat-label">TVs En Línea</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaVideo /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalVideos}</div>
            <div className="stat-label">Videos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaCalendar /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeSchedules}</div>
            <div className="stat-label">Programaciones Activas</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>TVs Recientes</h2>
        {recentTVs.length === 0 ? (
          <p>No hay TVs registradas</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Device ID</th>
                <th>Estado</th>
                <th>Última Conexión</th>
              </tr>
            </thead>
            <tbody>
              {recentTVs.map(tv => (
                <tr key={tv.id}>
                  <td>
                    {editingTV === tv.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            width: '200px'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleSaveName(tv.id)
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveName(tv.id)}
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{tv.name}</span>
                        <button
                          onClick={() => handleEditName(tv)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#F58342',
                            fontSize: '14px',
                            padding: '2px 6px'
                          }}
                          title="Editar nombre"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>
                  <td><code>{tv.device_id}</code></td>
                  <td>
                    <span className={`badge ${tv.status === 'online' ? 'badge-success' : 'badge-danger'}`}>
                      {tv.status === 'online' ? 'En línea' : 'Desconectado'}
                    </span>
                  </td>
                  <td>{tv.last_seen ? new Date(tv.last_seen).toLocaleString() : 'Nunca'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Dashboard

