import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaEdit, FaTrash, FaVideo, FaClock, FaCalendar, FaPlay, FaPlus, FaArrowUp, FaArrowDown, FaTimes, FaImage } from 'react-icons/fa'

function Schedules({ apiUrl }) {
  const [schedules, setSchedules] = useState([])
  const [tvs, setTVs] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [playlistItems, setPlaylistItems] = useState([]) // Items en la playlist
  const [formData, setFormData] = useState({
    tv_id: '',
    start_time: '',
    end_time: '',
    day_of_week: '',
    is_active: true,
    loop: false
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [schedulesRes, tvsRes, videosRes] = await Promise.all([
        axios.get(`${apiUrl}/schedules`),
        axios.get(`${apiUrl}/tvs`),
        axios.get(`${apiUrl}/videos`)
      ])
      setSchedules(schedulesRes.data)
      setTVs(tvsRes.data)
      setVideos(videosRes.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const addToPlaylist = (video) => {
    const isImage = video.type === 'image'
    const newItem = {
      id: video.id,
      name: video.name,
      type: video.type,
      duration: isImage ? 5 : (video.duration || 10), // Default 5s para imágenes
      order: playlistItems.length
    }
    setPlaylistItems([...playlistItems, newItem])
  }

  const removeFromPlaylist = (index) => {
    const newItems = playlistItems.filter((_, i) => i !== index)
    // Reordenar
    newItems.forEach((item, idx) => {
      item.order = idx
    })
    setPlaylistItems(newItems)
  }

  const moveItem = (index, direction) => {
    const newItems = [...playlistItems]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newItems.length) return

    // Intercambiar
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]

    // Reordenar
    newItems.forEach((item, idx) => {
      item.order = idx
    })

    setPlaylistItems(newItems)
  }

  const updateDuration = (index, duration) => {
    const newItems = [...playlistItems]
    newItems[index].duration = parseInt(duration) || 1
    setPlaylistItems(newItems)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (playlistItems.length === 0) {
      alert('Agrega al menos un video o imagen a la playlist')
      return
    }

    try {
      const daysToSchedule = formData.day_of_week !== '' ? [parseInt(formData.day_of_week)] : [null]

      for (const day of daysToSchedule) {
        for (let i = 0; i < playlistItems.length; i++) {
          const item = playlistItems[i]
          await axios.post(`${apiUrl}/schedules`, {
            tv_id: formData.tv_id,
            video_id: item.id,
            start_time: formData.start_time,
            end_time: formData.end_time || null,
            day_of_week: day,
            is_active: formData.is_active ? 1 : 0,
            sequence_order: i,
            is_loop: formData.loop ? 1 : 0,
            custom_duration: item.duration // Guardar duración personalizada (para imágenes)
          })
        }
      }

      alert(`✅ Programación creada con ${playlistItems.length} elemento(s)`)
      fetchData()
      setShowModal(false)
      setPlaylistItems([])
      setFormData({
        tv_id: '',
        start_time: '',
        end_time: '',
        day_of_week: '',
        is_active: true,
        loop: false
      })
    } catch (error) {
      console.error('Error creating schedule:', error)
      alert('Error al crear la programación')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta programación?')) return
    try {
      await axios.delete(`${apiUrl}/schedules/${id}`)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getDayName = (day) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[day] || 'Todos los días'
  }

  const groupSchedules = (schedules) => {
    const groups = new Map()
    const processed = new Set()

    schedules.forEach(schedule => {
      if (processed.has(schedule.id)) return

      if (schedule.sequence_order !== null && schedule.sequence_order !== undefined) {
        const sequenceKey = `${schedule.tv_id}_${schedule.start_time}_${schedule.day_of_week}`

        if (!groups.has(sequenceKey)) {
          const sequenceSchedules = schedules.filter(s =>
            s.tv_id === schedule.tv_id &&
            s.start_time === schedule.start_time &&
            s.day_of_week === schedule.day_of_week &&
            s.sequence_order !== null &&
            s.sequence_order !== undefined
          ).sort((a, b) => a.sequence_order - b.sequence_order)

          groups.set(sequenceKey, {
            id: sequenceKey,
            type: 'sequence',
            tv_id: schedule.tv_id,
            tv_name: schedule.tv_name,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            day_of_week: schedule.day_of_week,
            is_active: schedule.is_active,
            is_loop: schedule.is_loop,
            schedules: sequenceSchedules,
            video_count: sequenceSchedules.length
          })

          sequenceSchedules.forEach(s => processed.add(s.id))
        }
      } else {
        groups.set(schedule.id, {
          id: schedule.id,
          type: 'single',
          tv_id: schedule.tv_id,
          tv_name: schedule.tv_name,
          video_name: schedule.video_name,
          video_id: schedule.video_id,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          day_of_week: schedule.day_of_week,
          is_active: schedule.is_active,
          schedules: [schedule],
          video_count: 1
        })
        processed.add(schedule.id)
      }
    })

    return Array.from(groups.values())
  }

  const handleDeleteGroup = async (group) => {
    if (!confirm(`¿Eliminar esta programación${group.video_count > 1 ? ` con ${group.video_count} elementos` : ''}?`)) return

    try {
      for (const schedule of group.schedules) {
        await axios.delete(`${apiUrl}/schedules/${schedule.id}`)
      }
      fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getTotalDuration = () => {
    const total = playlistItems.reduce((sum, item) => sum + (item.duration || 0), 0)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="card">Cargando...</div>
  }

  const groupedSchedules = groupSchedules(schedules)

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>📅 Programación de Contenido</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              Crea playlists con videos e imágenes en el orden que quieras
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Nueva Programación
          </button>
        </div>

        {groupedSchedules.length === 0 ? (
          <p>No hay programaciones. Crea una para comenzar.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>TV</th>
                <th>Contenido</th>
                <th>Hora Inicio</th>
                <th>Día</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupedSchedules.map(group => (
                <tr key={group.id}>
                  <td>{group.tv_name || `TV-${group.tv_id}`}</td>
                  <td>
                    {group.type === 'sequence' ? (
                      <div>
                        <strong>{group.video_count} elemento{group.video_count !== 1 ? 's' : ''}</strong>
                        {group.is_loop === 1 && <span style={{ color: '#F58342', marginLeft: '5px' }}>(Loop)</span>}
                      </div>
                    ) : (
                      <div>{group.video_name}</div>
                    )}
                  </td>
                  <td>{group.start_time}</td>
                  <td>{group.day_of_week !== null ? getDayName(group.day_of_week) : 'Todos'}</td>
                  <td>
                    <span className={`badge ${group.is_active === 1 ? 'badge-success' : 'badge-danger'}`}>
                      {group.is_active === 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteGroup(group)}
                      style={{ padding: '6px 12px' }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL GRANDE */}
      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '1400px', width: '95%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>🎬 Nueva Programación - Constructor de Playlist</h3>
              <button className="close-btn" onClick={() => {
                setShowModal(false)
                setPlaylistItems([])
              }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: 'calc(90vh - 120px)' }}>
              {/* Configuración básica */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>📺 TV</label>
                  <select
                    value={formData.tv_id}
                    onChange={(e) => setFormData({ ...formData, tv_id: e.target.value })}
                    required
                  >
                    <option value="">Selecciona una TV</option>
                    {tvs.map(tv => (
                      <option key={tv.id} value={tv.id}>{tv.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>🕐 Hora de Inicio</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>📅 Día de la Semana</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  >
                    <option value="">Todos los días</option>
                    <option value="0">Domingo</option>
                    <option value="1">Lunes</option>
                    <option value="2">Martes</option>
                    <option value="3">Miércoles</option>
                    <option value="4">Jueves</option>
                    <option value="5">Viernes</option>
                    <option value="6">Sábado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.loop}
                      onChange={(e) => setFormData({ ...formData, loop: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    🔁 Loop (repetir playlist)
                  </label>
                </div>
              </div>

              {/* Constructor de Playlist */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                {/* PANEL IZQUIERDO: Biblioteca */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>📚 Biblioteca de Contenido</h4>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '15px',
                    background: '#f9fafb'
                  }}>
                    {videos.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
                        No hay contenido. Agrega videos o imágenes primero.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {videos.map(video => {
                          const isImage = video.type === 'image'
                          const isInPlaylist = playlistItems.some(item => item.id === video.id)

                          return (
                            <div
                              key={video.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '2px solid #e5e7eb'
                              }}
                            >
                              <div style={{ fontSize: '28px' }}>
                                {isImage ? '🖼️' : '🎬'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '14px' }}>{video.name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {isImage ? 'Imagen' : `Video • ${video.duration ? Math.floor(video.duration / 60) + ':' + (video.duration % 60).toString().padStart(2, '0') : 'N/A'}`}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToPlaylist(video)}
                                disabled={isInPlaylist}
                                style={{
                                  padding: '8px 16px',
                                  border: 'none',
                                  background: isInPlaylist ? '#d1d5db' : '#10b981',
                                  color: 'white',
                                  borderRadius: '8px',
                                  cursor: isInPlaylist ? 'not-allowed' : 'pointer',
                                  fontWeight: '600',
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                {isInPlaylist ? '✓ Agregado' : <><FaPlus /> Agregar</>}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* PANEL DERECHO: Playlist */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0 }}>🎵 Playlist ({playlistItems.length})</h4>
                    {playlistItems.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>
                        ⏱️ Duración: {getTotalDuration()}
                      </div>
                    )}
                  </div>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    border: '2px dashed #F58342',
                    borderRadius: '12px',
                    padding: '15px',
                    background: '#fff5f0',
                    minHeight: '200px'
                  }}>
                    {playlistItems.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#666', padding: '60px 20px' }}>
                        <FaPlay size={48} style={{ marginBottom: '20px', opacity: 0.3 }} />
                        <p>Agrega contenido desde la biblioteca ←</p>
                        <p style={{ fontSize: '13px' }}>Puedes mezclar videos e imágenes</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {playlistItems.map((item, index) => {
                          const isImage = item.type === 'image'

                          return (
                            <div
                              key={`${item.id}-${index}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '14px',
                                background: 'white',
                                borderRadius: '10px',
                                border: '2px solid #F58342',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              {/* Número de orden */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#F58342',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                flexShrink: 0
                              }}>
                                {index + 1}
                              </div>

                              {/* Ícono */}
                              <div style={{ fontSize: '28px', flexShrink: 0 }}>
                                {isImage ? '🖼️' : '🎬'}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  {isImage ? 'Imagen' : 'Video'}
                                </div>
                              </div>

                              {/* Duración - Solo editable para imágenes */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <FaClock style={{ color: '#6b7280', fontSize: '12px' }} />
                                {isImage ? (
                                  // Input editable solo para imágenes
                                  <>
                                    <input
                                      type="number"
                                      min="1"
                                      max="600"
                                      value={item.duration}
                                      onChange={(e) => updateDuration(index, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        width: '60px',
                                        padding: '6px 8px',
                                        border: '2px solid #10b981',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        background: '#f0fdf4'
                                      }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>s</span>
                                  </>
                                ) : (
                                  // Solo mostrar duración para videos (no editable)
                                  <div style={{
                                    padding: '6px 12px',
                                    background: '#f3f4f6',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#6b7280'
                                  }}>
                                    {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                                  </div>
                                )}
                              </div>

                              {/* Controles */}
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => moveItem(index, 'up')}
                                  disabled={index === 0}
                                  style={{
                                    padding: '8px',
                                    border: 'none',
                                    background: index === 0 ? '#e5e7eb' : '#3b82f6',
                                    color: 'white',
                                    borderRadius: '6px',
                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <FaArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(index, 'down')}
                                  disabled={index === playlistItems.length - 1}
                                  style={{
                                    padding: '8px',
                                    border: 'none',
                                    background: index === playlistItems.length - 1 ? '#e5e7eb' : '#3b82f6',
                                    color: 'white',
                                    borderRadius: '6px',
                                    cursor: index === playlistItems.length - 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <FaArrowDown size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFromPlaylist(index)}
                                  style={{
                                    padding: '8px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false)
                    setPlaylistItems([])
                  }}
                >
                  <FaTimes /> Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={playlistItems.length === 0}
                  style={{
                    opacity: playlistItems.length === 0 ? 0.5 : 1,
                    cursor: playlistItems.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <FaPlay /> Crear Programación ({playlistItems.length} elemento{playlistItems.length !== 1 ? 's' : ''})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedules
