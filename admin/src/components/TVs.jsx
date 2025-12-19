import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaCalendar, FaClock, FaVideo, FaCheck, FaPlay, FaImage, FaSun, FaBriefcase, FaClipboardList, FaBullseye, FaStar, FaUmbrellaBeach, FaTimes, FaEdit, FaPlayCircle, FaMapMarkerAlt, FaStop } from 'react-icons/fa'
import io from 'socket.io-client'

function TVs({ apiUrl }) {
  const [tvs, setTVs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedTV, setSelectedTV] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [videos, setVideos] = useState([])
  const [editingTV, setEditingTV] = useState(null)
  const [editName, setEditName] = useState('')
  const [scheduleData, setScheduleData] = useState({
    start_time: '',
    end_time: '',
    days: [],
    video_ids: [],
    is_active: true,
    loop: false
  })
  const [selectedVideos, setSelectedVideos] = useState([])
  const [totalDuration, setTotalDuration] = useState(0)
  const [previewVideo, setPreviewVideo] = useState(null)

  /* Socket.io Effect */
  useEffect(() => {
    try {
      // Configurar Socket.io URL base
      // Si apiUrl es http://localhost:3000/api -> ws://localhost:3000
      let socketUrl = apiUrl
      if (socketUrl.endsWith('/api')) {
        socketUrl = socketUrl.substring(0, socketUrl.length - 4)
      }

      console.log('🔌 Conectando admin a WebSocket:', socketUrl)

      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
      })

      socket.on('connect', () => {
        console.log('✅ Admin conectado a WebSocket')
        socket.emit('admin-connect')
      })

      socket.on('tv-status-change', (data) => {
        console.log('📡 Cambio de estado recibido:', data)
        setTVs(prevTvs => prevTvs.map(tv => {
          if (tv.device_id === data.device_id) {
            return {
              ...tv,
              status: data.status
            }
          }
          return tv
        }))
      })

      return () => {
        socket.disconnect()
      }
    } catch (e) {
      console.error('Error setup socket:', e)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchTVs()
    fetchVideos()
    const interval = setInterval(fetchTVs, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTVs = async () => {
    try {
      const res = await axios.get(`${apiUrl}/tvs`, { timeout: 5000 })
      setTVs(res.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching TVs:', error)
      setTVs([])
      setLoading(false)
    }
  }

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${apiUrl}/videos`)
      setVideos(res.data)
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta TV?')) return

    try {
      await axios.delete(`${apiUrl}/tvs/${id}`)
      fetchTVs()
    } catch (error) {
      console.error('Error deleting TV:', error)
      alert('Error al eliminar la TV')
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
      fetchTVs() // Refrescar datos
    } catch (error) {
      console.error('Error updating TV name:', error)
      alert('Error al actualizar el nombre')
    }
  }

  const handleCancelEdit = () => {
    setEditingTV(null)
    setEditName('')
  }

  const handleSchedule = (tv) => {
    setSelectedTV(tv)
    setScheduleData({
      start_time: '',
      end_time: '',
      days: [],
      video_ids: [],
      is_active: true,
      loop: false
    })
    setSelectedVideos([])
    setTotalDuration(0)
    setShowScheduleModal(true)
  }

  const handleVideoToggle = (video) => {
    setSelectedVideos(prev => {
      const isSelected = prev.find(v => v.id === video.id)
      if (isSelected) {
        const newSelected = prev.filter(v => v.id !== video.id)
        updateTotalDuration(newSelected)
        return newSelected
      } else {
        const newSelected = [...prev, video]
        updateTotalDuration(newSelected)
        return newSelected
      }
    })
  }

  const updateTotalDuration = (videos) => {
    const total = videos.reduce((sum, video) => sum + (video.duration || 0), 0)
    setTotalDuration(total)

    // Actualizar hora de fin automáticamente si hay hora de inicio
    if (scheduleData.start_time && total > 0) {
      const start = new Date(`2000-01-01T${scheduleData.start_time}`)
      const end = new Date(start.getTime() + total * 1000)
      const endTime = end.toTimeString().slice(0, 5)
      setScheduleData(prev => ({ ...prev, end_time: endTime }))
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  const getVideoThumbnail = (video) => {
    // Intentar obtener thumbnail de la URL
    if (video.url) {
      const url = video.url.toLowerCase()
      if (url.includes('.mp4') || url.includes('.webm')) {
        // Para videos, podríamos usar un frame o un placeholder
        return null
      }
      // Si es imagen, usar la URL directamente
      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return video.url
      }
    }
    return null
  }

  const handleDayToggle = (day) => {
    setScheduleData(prev => {
      const days = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
      return { ...prev, days }
    })
  }

  const handleStartTimeChange = (time) => {
    setScheduleData(prev => {
      const newData = { ...prev, start_time: time }
      // Calcular hora de fin automáticamente
      if (time && totalDuration > 0) {
        const start = new Date(`2000-01-01T${time}`)
        const end = new Date(start.getTime() + totalDuration * 1000)
        const endTime = end.toTimeString().slice(0, 5)
        newData.end_time = endTime
      }
      return newData
    })
  }

  const handleSaveSchedule = async () => {
    if (!scheduleData.start_time || selectedVideos.length === 0) {
      alert('Por favor completa la hora de inicio y selecciona al menos un video')
      return
    }

    try {
      const daysToSchedule = scheduleData.days.length > 0 ? scheduleData.days : [null]
      let createdCount = 0

      // Si loop está activado (con uno o más videos), crear programación con loop
      if (scheduleData.loop) {
        // Crear programación con lista de videos para loop continuo
        // Todos los videos se reproducen en secuencia y luego vuelven al inicio
        for (const day of daysToSchedule) {
          // Calcular hora de fin total (suma de todas las duraciones)
          let totalDuration = 0
          selectedVideos.forEach(video => {
            totalDuration += video.duration || 0
          })

          let endTime = scheduleData.end_time
          if (!endTime && totalDuration > 0) {
            const start = new Date(`2000-01-01T${scheduleData.start_time}`)
            const end = new Date(start.getTime() + totalDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }

          // Crear programaciones con el MISMO start_time para que el servidor las agrupe
          for (let i = 0; i < selectedVideos.length; i++) {
            const video = selectedVideos[i]

            await axios.post(`${apiUrl}/schedules`, {
              tv_id: selectedTV.id,
              video_id: video.id,
              start_time: scheduleData.start_time, // MISMO start_time para todos
              end_time: endTime, // Misma hora de fin para toda la secuencia
              day_of_week: day,
              is_active: scheduleData.is_active ? 1 : 0,
              sequence_order: i, // Orden en la secuencia
              is_loop: 1 // Loop activado
            })
            createdCount++
          }
        }
      } else {
        // Reproducción normal: crear secuencia de videos sin loop
        // Si hay múltiples videos, crear UNA SOLA programación con todos los videos en secuencia
        if (selectedVideos.length > 1) {
          // Crear secuencia de videos sin loop - TODOS con el mismo start_time
          for (const day of daysToSchedule) {
            // Calcular hora de fin total (suma de todas las duraciones)
            let totalDuration = 0
            selectedVideos.forEach(video => {
              totalDuration += video.duration || 0
            })

            let endTime = scheduleData.end_time
            if (!endTime && totalDuration > 0) {
              const start = new Date(`2000-01-01T${scheduleData.start_time}`)
              const end = new Date(start.getTime() + totalDuration * 1000)
              endTime = end.toTimeString().slice(0, 5)
            }

            // Crear programaciones con el MISMO start_time para que el servidor las agrupe
            for (let i = 0; i < selectedVideos.length; i++) {
              const video = selectedVideos[i]

              await axios.post(`${apiUrl}/schedules`, {
                tv_id: selectedTV.id,
                video_id: video.id,
                start_time: scheduleData.start_time, // MISMO start_time para todos
                end_time: endTime, // Misma hora de fin para toda la secuencia
                day_of_week: day,
                is_active: scheduleData.is_active ? 1 : 0,
                sequence_order: i, // Marcar orden de secuencia
                is_loop: 0 // Sin loop
              })
              createdCount++
            }
          }
        } else {
          // Un solo video: programación normal
          for (const video of selectedVideos) {
            for (const day of daysToSchedule) {
              const videoDuration = video.duration || 0
              let endTime = scheduleData.end_time

              // Si no hay hora de fin, calcularla
              if (!endTime && videoDuration > 0) {
                const start = new Date(`2000-01-01T${scheduleData.start_time}`)
                const end = new Date(start.getTime() + videoDuration * 1000)
                endTime = end.toTimeString().slice(0, 5)
              }

              await axios.post(`${apiUrl}/schedules`, {
                tv_id: selectedTV.id,
                video_id: video.id,
                start_time: scheduleData.start_time,
                end_time: endTime || null,
                day_of_week: day,
                is_active: scheduleData.is_active ? 1 : 0,
                is_loop: scheduleData.loop ? 1 : 0 // Incluir is_loop para videos individuales también
              })
              createdCount++
            }
          }
        }
      }

      // Mostrar mensaje apropiado
      if (selectedVideos.length > 1) {
        alert(`Programación creada exitosamente: 1 programación con ${selectedVideos.length} videos en secuencia`)
      } else {
        alert(`Programación creada exitosamente (${createdCount} programación${createdCount > 1 ? 'es' : ''})`)
      }
      setShowScheduleModal(false)
      setSelectedTV(null)
      setSelectedVideos([])
      setScheduleData({
        start_time: '',
        end_time: '',
        days: [],
        video_ids: [],
        is_active: true,
        loop: false
      })
      setTotalDuration(0)
    } catch (error) {
      console.error('Error creating schedule:', error)
      alert('Error al crear la programación: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleStopPlayback = async (tv) => {
    if (!confirm(`¿Detener la reproducción en ${tv.name}? El TV volverá a la pantalla de espera.`)) return

    try {
      await axios.post(`${apiUrl}/client/stop/${tv.device_id}`)
      alert('✅ Reproducción detenida correctamente')
    } catch (error) {
      console.error('Error stopping playback:', error)
      alert('❌ Error al detener: ' + (error.response?.data?.error || error.message))
    }
  }

  const handlePlayVideo = async (tv) => {
    setSelectedVideo(tv)
    setShowModal(true)
  }

  const handleQuickPlay = async (tv, videoId) => {
    if (!confirm(`¿Reproducir este video en ${tv.name} ahora?`)) return

    try {
      await axios.post(`${apiUrl}/client/play/${tv.device_id}`, {
        video_id: videoId
      })
      alert('✅ Video enviado para reproducción inmediata')
    } catch (error) {
      console.error('Error playing video:', error)
      alert('❌ Error al reproducir video: ' + (error.response?.data?.error || error.message))
    }
  }

  const confirmPlayVideo = async () => {
    if (!selectedVideo || !selectedVideo.videoId) return

    try {
      await axios.post(`${apiUrl}/client/play/${selectedVideo.device_id}`, {
        video_id: selectedVideo.videoId
      })
      alert('✅ Video enviado para reproducción inmediata')
      setShowModal(false)
      setSelectedVideo(null)
    } catch (error) {
      console.error('Error playing video:', error)
      alert('❌ Error al reproducir video: ' + (error.response?.data?.error || error.message))
    }
  }

  if (loading) {
    return <div className="card">Cargando...</div>
  }

  return (
    <div>
      <div className="card">
        <h2>Gestión de TVs</h2>
        {tvs.length === 0 ? (
          <p>No hay TVs registradas. Las TVs se registran automáticamente cuando se conectan.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Device ID</th>
                <th>Estado</th>
                <th>Ubicación</th>
                <th>Última Conexión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tvs.map(tv => (
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
                          <FaTimes />
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
                          <FaEdit />
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
                  <td>
                    {tv.location ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={`https://flagcdn.com/20x15/${tv.location.countryCode.toLowerCase()}.png`}
                          alt={tv.location.country}
                          title={tv.location.country}
                          onError={(e) => { e.target.style.display = 'none' }}
                          style={{ borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{tv.location.city}</span>
                          <span style={{ fontSize: '11px', color: '#666' }}>{tv.location.region}</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#aaa', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaMapMarkerAlt /> Desconocida
                      </span>
                    )}
                  </td>
                  <td>{tv.last_seen ? new Date(tv.last_seen).toLocaleString() : 'Nunca'}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePlayVideo(tv)}
                      style={{ marginRight: '10px', marginBottom: '5px' }}
                      title="Reproducir video inmediatamente en este TV"
                    >
                      <FaPlayCircle style={{ marginRight: '6px' }} />
                      Reproducir Ahora
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleStopPlayback(tv)}
                      style={{
                        marginRight: '10px',
                        marginBottom: '5px',
                        background: '#ef4444',
                        color: 'white'
                      }}
                      title="Detener reproducción y volver a espera"
                    >
                      <FaStop style={{ marginRight: '6px' }} /> Detener
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleSchedule(tv)}
                      style={{
                        marginRight: '10px',
                        marginBottom: '5px',
                        background: '#10b981',
                        color: 'white'
                      }}
                    >
                      <FaCalendar style={{ marginRight: '8px' }} /> Programar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(tv.id)}
                      style={{ marginBottom: '5px' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3><FaPlayCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />Reproducir Video en {selectedVideo?.name}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div style={{
              marginBottom: '20px',
              padding: '15px',
              background: '#f0f4ff',
              borderRadius: '8px',
              border: '1px solid #c7d2fe'
            }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaVideo style={{ color: '#667eea' }} />
                Selecciona un video para reproducir inmediatamente
              </strong>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                El video se reproducirá de forma inmediata en el TV, sobrescribiendo cualquier programación activa.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '15px',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '10px',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              {videos.length === 0 ? (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>
                  No hay videos disponibles. Agrega videos primero.
                </p>
              ) : (
                videos.map(video => {
                  const thumbnail = getVideoThumbnail(video)
                  return (
                    <div
                      key={video.id}
                      onClick={() => handleQuickPlay(selectedVideo, video.id)}
                      style={{
                        position: 'relative',
                        border: '2px solid #ddd',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'white',
                        transition: 'all 0.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.borderColor = '#667eea'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.borderColor = '#ddd'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={video.name}
                          style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100px',
                          background: '#F58342',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '32px'
                        }}>
                          <FaVideo />
                        </div>
                      )}
                      <div style={{ padding: '10px' }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {video.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: '#F58342',
                        color: 'white',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        <FaPlay />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3><FaCalendar style={{ marginRight: '8px', verticalAlign: 'middle' }} />Programar Videos en {selectedTV?.name}</h3>
              <button className="close-btn" onClick={() => {
                setShowScheduleModal(false)
                setSelectedTV(null)
                setSelectedVideos([])
              }}>×</button>
            </div>

            {/* Selección de Videos */}
            <div className="form-group">
              <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaVideo style={{ color: '#F58342' }} />
                Seleccionar Videos ({selectedVideos.length} seleccionado{selectedVideos.length !== 1 ? 's' : ''})
              </label>
              <div
                className="video-selection-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '15px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '15px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}
              >
                {videos.length === 0 ? (
                  <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>
                    No hay videos disponibles. Agrega videos primero.
                  </p>
                ) : (
                  videos.map(video => {
                    const isSelected = selectedVideos.find(v => v.id === video.id)
                    const thumbnail = getVideoThumbnail(video)
                    return (
                      <div
                        key={video.id}
                        onClick={(e) => {
                          // Si se hace clic en el botón de preview, no toggle
                          if (e.target.closest('.preview-btn')) {
                            return
                          }
                          handleVideoToggle(video)
                        }}
                        style={{
                          position: 'relative',
                          border: isSelected ? '3px solid #F58342' : '2px solid #ddd',
                          borderRadius: '12px',
                          overflow: 'visible',
                          cursor: 'pointer',
                          background: 'white',
                          transition: 'all 0.3s',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isSelected ? '0 4px 12px rgba(245, 131, 66, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '100px', overflow: 'hidden' }}>
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={video.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              background: '#F58342',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '32px'
                            }}>
                              <FaVideo />
                            </div>
                          )}
                          {/* Botón de vista previa centrado sobre la miniatura */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setPreviewVideo(video)
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              background: 'rgba(245, 131, 66, 0.9)',
                              color: 'white',
                              border: '2px solid white',
                              borderRadius: '50%',
                              width: '50px',
                              height: '50px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 20,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                              transition: 'all 0.3s',
                              visibility: 'visible',
                              opacity: 1
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(224, 114, 47, 1)'
                              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(245, 131, 66, 0.9)'
                              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
                            }}
                          >
                            <FaPlayCircle style={{ fontSize: '24px' }} />
                          </button>
                        </div>
                        <div style={{ padding: '10px' }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {video.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {formatDuration(video.duration)}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: '#F58342',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            <FaCheck />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Resumen de selección */}
            {selectedVideos.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #c7d2fe'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaVideo style={{ color: '#667eea' }} />
                    <strong>Videos seleccionados:</strong> {selectedVideos.length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaClock style={{ color: '#667eea' }} />
                    <strong>Duración total:</strong> {formatDuration(totalDuration)}
                  </div>
                </div>
                {selectedVideos.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#4b5563' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaPlay style={{ fontSize: '12px' }} />
                      Orden de reproducción:
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                      {selectedVideos.map((video, index) => (
                        <span
                          key={video.id}
                          style={{
                            background: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span style={{ color: '#667eea', fontWeight: 'bold' }}>{index + 1}.</span>
                          {video.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Horarios */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaClock style={{ color: '#667eea' }} />
                  Hora de Inicio *
                </label>
                <input
                  type="time"
                  value={scheduleData.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaClock style={{ color: '#667eea' }} />
                  Hora de Fin {totalDuration > 0 && `(Calculada: ${scheduleData.end_time || 'N/A'})`}
                </label>
                <input
                  type="time"
                  value={scheduleData.end_time}
                  onChange={(e) => setScheduleData({ ...scheduleData, end_time: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Se calcula automáticamente según la duración de los videos
                </small>
              </div>
            </div>

            {/* Días de la Semana */}
            <div className="form-group">
              <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCalendar style={{ color: '#667eea' }} />
                Días de la Semana
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '10px',
                marginTop: '10px'
              }}>
                {[
                  { value: 0, label: 'Dom', icon: FaSun },
                  { value: 1, label: 'Lun', icon: FaBriefcase },
                  { value: 2, label: 'Mar', icon: FaCalendar },
                  { value: 3, label: 'Mié', icon: FaClipboardList },
                  { value: 4, label: 'Jue', icon: FaBullseye },
                  { value: 5, label: 'Vie', icon: FaStar },
                  { value: 6, label: 'Sáb', icon: FaUmbrellaBeach }
                ].map(day => {
                  const IconComponent = day.icon;
                  return (
                    <label
                      key={day.value}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '12px 8px',
                        border: scheduleData.days.includes(day.value) ? '2px solid #F58342' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: scheduleData.days.includes(day.value) ? '#f0f4ff' : 'white',
                        transition: 'all 0.3s',
                        fontWeight: scheduleData.days.includes(day.value) ? '600' : '400'
                      }}
                    >
                      <IconComponent style={{ fontSize: '20px', color: scheduleData.days.includes(day.value) ? '#F58342' : '#6b7280' }} />
                      <input
                        type="checkbox"
                        checked={scheduleData.days.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                        style={{ cursor: 'pointer', marginTop: '5px' }}
                      />
                      <span style={{ fontSize: '12px' }}>{day.label}</span>
                    </label>
                  );
                })}
              </div>
              <small style={{ color: '#666', marginTop: '10px', display: 'block', textAlign: 'center' }}>
                Si no seleccionas ningún día, se reproducirá todos los días
              </small>
            </div>

            {/* Opciones adicionales */}
            <div style={{
              background: '#f9fafb',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleData.loop}
                    onChange={(e) => setScheduleData({ ...scheduleData, loop: e.target.checked })}
                    style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaPlay style={{ fontSize: '14px' }} />
                      Loop
                    </strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      {selectedVideos.length === 0
                        ? 'Selecciona al menos un video para activar'
                        : selectedVideos.length === 1
                          ? 'El video se reproducirá en loop continuo'
                          : 'Los videos se reproducirán en secuencia y luego volverán al inicio (loop continuo)'}
                    </div>
                  </div>
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleData.is_active}
                    onChange={(e) => setScheduleData({ ...scheduleData, is_active: e.target.checked })}
                    style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong>Programación Activa</strong>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowScheduleModal(false)
                  setSelectedTV(null)
                  setSelectedVideos([])
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSchedule}
                disabled={selectedVideos.length === 0 || !scheduleData.start_time}
                style={{
                  fontSize: '16px',
                  padding: '12px 24px',
                  background: selectedVideos.length === 0 || !scheduleData.start_time ? '#ccc' : '#F58342'
                }}
              >
                <FaCheck style={{ marginRight: '8px' }} /> Crear Programación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa del Video */}
      {previewVideo && (
        <div
          className="modal"
          onClick={() => setPreviewVideo(null)}
          style={{ zIndex: 2000 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              width: '90%',
              padding: '20px',
              background: '#1a1a1a'
            }}
          >
            <div className="modal-header" style={{ marginBottom: '15px', borderBottom: '1px solid #333' }}>
              <h3 style={{ color: 'white', margin: 0 }}>{previewVideo.name}</h3>
              <button
                className="close-btn"
                onClick={() => setPreviewVideo(null)}
                style={{ color: 'white', fontSize: '28px' }}
              >
                ×
              </button>
            </div>
            <div style={{
              width: '100%',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <video
                src={previewVideo.url || previewVideo.bunnyUrl || previewVideo.b2Url}
                controls
                autoPlay
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              >
                Tu navegador no soporta video HTML5.
              </video>
            </div>
            <div style={{ marginTop: '15px', color: '#ccc', fontSize: '14px' }}>
              <div><strong>Duración:</strong> {formatDuration(previewVideo.duration)}</div>
              {previewVideo.type && <div><strong>Tipo:</strong> {previewVideo.type}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TVs

