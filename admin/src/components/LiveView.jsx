import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { FaVideo, FaImage, FaSpinner } from 'react-icons/fa'
import './LiveView.css'

// Componente que clona exactamente lo que ve el TV usando iframe
function TVClone({ deviceId, apiUrl, className, playbackState }) {
  const baseUrl = apiUrl.replace('/api', '')
  const clientUrl = `${baseUrl}/client?device_id=${deviceId}&preview=true`
  
  return (
    <iframe
      src={clientUrl}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#000',
        pointerEvents: 'none' // Evitar interacciones
      }}
      allow="autoplay; fullscreen; encrypted-media"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      scrolling="no"
    />
  )
}

function LiveView({ apiUrl }) {
  const [tvs, setTVs] = useState([])
  const [playbackStates, setPlaybackStates] = useState({}) // { device_id: playbackState }
  const [selectedTV, setSelectedTV] = useState(null)
  const [loading, setLoading] = useState(true)
  const socketRef = useRef(null)

  // Obtener lista de TVs
  const fetchTVs = async () => {
    try {
      const res = await axios.get(`${apiUrl}/tvs`, { timeout: 5000 })
      const onlineTVs = (res.data || []).filter(tv => tv.status === 'online')
      setTVs(onlineTVs)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching TVs:', error)
      setTVs([])
      setLoading(false)
    }
  }

  // Inicializar WebSocket
  useEffect(() => {
    const serverBaseUrl = apiUrl.replace('/api', '')
    console.log('🔌 Conectando WebSocket admin:', serverBaseUrl)
    
    socketRef.current = io(serverBaseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000
    })

    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket admin conectado')
      // Registrar como admin
      socketRef.current.emit('admin-connect')
      
      // Solicitar estado actual de todos los TVs
      socketRef.current.emit('request-all-playback-states')
    })

    socketRef.current.on('all-playback-states', (states) => {
      console.log('📊 Estados recibidos:', states)
      const statesMap = {}
      states.forEach(state => {
        statesMap[state.device_id] = state
      })
      setPlaybackStates(statesMap)
    })

    socketRef.current.on('tv-playback-update', (state) => {
      console.log('📊 Actualización de reproducción:', state)
      setPlaybackStates(prev => ({
        ...prev,
        [state.device_id]: state
      }))
    })

    socketRef.current.on('disconnect', () => {
      console.log('❌ WebSocket admin desconectado')
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [apiUrl])

  // Solicitar actualización periódica solo cuando el componente está montado
  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) return

    // Solicitar estado cada 5 segundos cuando la Vista en Vivo está activa
    const interval = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('request-all-playback-states')
      }
    }, 5000) // Cada 5 segundos

    return () => clearInterval(interval)
  }, [socketRef.current?.connected])

  // Obtener TVs al montar y cada 30 segundos
  useEffect(() => {
    fetchTVs()
    const interval = setInterval(fetchTVs, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleTVClick = (tv) => {
    setSelectedTV(tv)
  }

  const handleAspectRatioChange = async (tvId, aspectRatio) => {
    try {
      console.log(`🔄 Actualizando aspect ratio del TV ${tvId} a ${aspectRatio}`)
      const response = await axios.patch(`${apiUrl}/tvs/${tvId}`, { aspect_ratio: aspectRatio })
      console.log('✅ Aspect ratio actualizado:', response.data)
      
      // Actualizar el estado local
      setTVs(prev => prev.map(tv => 
        tv.id === tvId ? { ...tv, aspect_ratio: aspectRatio } : tv
      ))
      
      // También actualizar selectedTV si está seleccionado
      if (selectedTV && selectedTV.id === tvId) {
        setSelectedTV({ ...selectedTV, aspect_ratio: aspectRatio })
      }
    } catch (error) {
      console.error('❌ Error actualizando aspect ratio:', error)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error status:', error.response?.status)
      alert(`Error al actualizar la orientación del TV: ${error.response?.data?.error || error.message}`)
    }
  }

  const getContentUrl = (content) => {
    if (!content) return null
    if (content.type === 'sequence' && content.videos && content.videos.length > 0) {
      return content.videos[0].url
    }
    return content.url
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="live-view-page">
        <div className="card">
          <h2>📺 Vista en Vivo</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FaSpinner className="spinner" />
            <p>Cargando TVs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (tvs.length === 0) {
    return (
      <div className="live-view-page">
        <div className="card">
          <h2>📺 Vista en Vivo</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No hay TVs conectados</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="live-view-page">
      <div className="card">
        <h2>📺 Vista en Vivo</h2>
        <div className="live-view-grid-large">
          {tvs.map(tv => {
            const playbackState = playbackStates[tv.device_id]
            
            return (
              <div
                key={tv.id}
                className="live-view-thumbnail-large"
                onClick={() => handleTVClick(tv)}
              >
                <div className="thumbnail-header-large">
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: 'white',
                    margin: 0,
                    flex: 1
                  }}>
                    {tv.name || `TV-${tv.device_id?.slice(-6)}`}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                      value={tv.aspect_ratio || '16:9'}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleAspectRatioChange(tv.id, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        background: '#444',
                        color: 'white',
                        border: '1px solid #666',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                      title="Configurar orientación (16:9 horizontal, 9:16 vertical)"
                    >
                      <option value="16:9">16:9 (Horizontal)</option>
                      <option value="9:16">9:16 (Vertical)</option>
                    </select>
                    <span className={`status-badge ${tv.status === 'online' ? 'online' : 'offline'}`}>
                      {tv.status === 'online' ? '● En línea' : '○ Desconectado'}
                    </span>
                  </div>
                </div>
                
                <div 
                  className="thumbnail-content-large"
                  style={{
                    aspectRatio: (tv.aspect_ratio || '16:9') === '9:16' ? '9/16' : '16/9',
                    position: 'relative'
                  }}
                >
                  <TVClone
                    key={tv.device_id}
                    deviceId={tv.device_id}
                    apiUrl={apiUrl}
                    className="thumbnail-video-large"
                    playbackState={playbackState}
                  />
                </div>
                
                <div className="thumbnail-footer-large">
                  {playbackState ? (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div><strong>{playbackState.videoName || 'Sin contenido'}</strong></div>
                      {playbackState.duration > 0 && (
                        <div>
                          {formatTime(playbackState.currentTime)} / {formatTime(playbackState.duration)}
                          {playbackState.totalVideos > 1 && (
                            <span> • Video {playbackState.videoIndex + 1}/{playbackState.totalVideos}</span>
                          )}
                        </div>
                      )}
                      <div style={{ 
                        color: playbackState.isPlaying ? '#10b981' : '#f59e0b',
                        fontSize: '11px',
                        marginTop: '4px'
                      }}>
                        {playbackState.isPlaying ? '▶ Reproduciendo' : '⏸ Pausado'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      Esperando contenido...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de vista ampliada */}
      {selectedTV && (
        <div className="live-view-modal" onClick={() => setSelectedTV(null)}>
          <div className="live-view-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTV.name || `TV-${selectedTV.device_id?.slice(-6)}`}</h3>
              {playbackStates[selectedTV.device_id] && (
                <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                  <div><strong>{playbackStates[selectedTV.device_id].videoName || 'Sin contenido'}</strong></div>
                  {playbackStates[selectedTV.device_id].duration > 0 && (
                    <div>
                      {formatTime(playbackStates[selectedTV.device_id].currentTime)} / {formatTime(playbackStates[selectedTV.device_id].duration)}
                      {playbackStates[selectedTV.device_id].totalVideos > 1 && (
                        <span> • Video {playbackStates[selectedTV.device_id].videoIndex + 1}/{playbackStates[selectedTV.device_id].totalVideos}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button className="close-btn" onClick={() => setSelectedTV(null)}>
                ×
              </button>
            </div>
            
            <div 
              className="modal-body"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: (selectedTV.aspect_ratio || '16:9') === '9:16' ? '400px' : '1200px',
                  aspectRatio: (selectedTV.aspect_ratio || '16:9') === '9:16' ? '9/16' : '16/9',
                  background: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <TVClone
                  key={`modal-${selectedTV.device_id}`}
                  deviceId={selectedTV.device_id}
                  apiUrl={apiUrl}
                  className="modal-video"
                  playbackState={playbackStates[selectedTV.device_id]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveView
