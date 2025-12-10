import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaEdit, FaTrash, FaVideo, FaClock, FaCalendar, FaPlay } from 'react-icons/fa'

function Schedules({ apiUrl }) {
  const [schedules, setSchedules] = useState([])
  const [tvs, setTVs] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedScheduleGroup, setSelectedScheduleGroup] = useState(null)
  const [formData, setFormData] = useState({
    tv_id: '',
    video_ids: [],
    start_time: '',
    end_time: '',
    day_of_week: '',
    is_active: true,
    loop: false
  })
  const [selectedVideos, setSelectedVideos] = useState([])
  const [editingScheduleGroup, setEditingScheduleGroup] = useState(null)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (selectedVideos.length === 0) {
      alert('Por favor selecciona al menos un video')
      return
    }
    
    try {
      const daysToSchedule = formData.day_of_week !== '' ? [parseInt(formData.day_of_week)] : [null]
      let createdCount = 0
      
      // Si hay múltiples videos y loop está activado, crear secuencia con loop
      if (selectedVideos.length > 1 && formData.loop) {
        for (const day of daysToSchedule) {
          let totalDuration = 0
          selectedVideos.forEach(video => {
            totalDuration += video.duration || 0
          })
          
          let endTime = formData.end_time || null
          if (!endTime && totalDuration > 0) {
            const start = new Date(`2000-01-01T${formData.start_time}`)
            const end = new Date(start.getTime() + totalDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }
          
          for (let i = 0; i < selectedVideos.length; i++) {
            const video = selectedVideos[i]
            await axios.post(`${apiUrl}/schedules`, {
              tv_id: formData.tv_id,
              video_id: video.id,
              start_time: formData.start_time,
              end_time: endTime,
              day_of_week: day,
              is_active: formData.is_active ? 1 : 0,
              sequence_order: i,
              is_loop: 1
            })
            createdCount++
          }
        }
      } else if (selectedVideos.length > 1) {
        // Múltiples videos sin loop - crear secuencia
        for (const day of daysToSchedule) {
          let totalDuration = 0
          selectedVideos.forEach(video => {
            totalDuration += video.duration || 0
          })
          
          let endTime = formData.end_time || null
          if (!endTime && totalDuration > 0) {
            const start = new Date(`2000-01-01T${formData.start_time}`)
            const end = new Date(start.getTime() + totalDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }
          
          for (let i = 0; i < selectedVideos.length; i++) {
            const video = selectedVideos[i]
            await axios.post(`${apiUrl}/schedules`, {
              tv_id: formData.tv_id,
              video_id: video.id,
              start_time: formData.start_time,
              end_time: endTime,
              day_of_week: day,
              is_active: formData.is_active ? 1 : 0,
              sequence_order: i,
              is_loop: 0
            })
            createdCount++
          }
        }
      } else {
        // Un solo video
        for (const day of daysToSchedule) {
          const video = selectedVideos[0]
          const videoDuration = video.duration || 0
          let endTime = formData.end_time || null
          
          if (!endTime && videoDuration > 0) {
            const start = new Date(`2000-01-01T${formData.start_time}`)
            const end = new Date(start.getTime() + videoDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }
          
          await axios.post(`${apiUrl}/schedules`, {
            tv_id: formData.tv_id,
            video_id: video.id,
            start_time: formData.start_time,
            end_time: endTime,
            day_of_week: day,
            is_active: formData.is_active ? 1 : 0
          })
          createdCount++
        }
      }
      
      if (selectedVideos.length > 1) {
        alert(`Programación creada exitosamente: 1 programación con ${selectedVideos.length} videos en secuencia`)
      } else {
        alert(`Programación creada exitosamente`)
      }
      
      fetchData()
      setShowModal(false)
      setSelectedVideos([])
      setFormData({
        tv_id: '',
        video_ids: [],
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
  
  const toggleVideoSelection = (video) => {
    if (selectedVideos.find(v => v.id === video.id)) {
      setSelectedVideos(selectedVideos.filter(v => v.id !== video.id))
    } else {
      setSelectedVideos([...selectedVideos, video])
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta programación?')) return
    
    try {
      await axios.delete(`${apiUrl}/schedules/${id}`)
      fetchData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Error al eliminar la programación')
    }
  }

  const getDayName = (day) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[day] || 'Todos los días'
  }

  // Agrupar programaciones por secuencia
  const groupSchedules = (schedules) => {
    const groups = new Map()
    const processed = new Set()

    schedules.forEach(schedule => {
      // Si ya fue procesado, saltarlo
      if (processed.has(schedule.id)) return

      // Si tiene sequence_order, es parte de una secuencia
      if (schedule.sequence_order !== null && schedule.sequence_order !== undefined) {
        // Buscar todas las programaciones de la misma secuencia
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
        // Programación individual
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

  const handleViewDetails = (group) => {
    setSelectedScheduleGroup(group)
    setShowDetailModal(true)
  }

  const handleEditSchedule = (group) => {
    setEditingScheduleGroup(group)
    // Cargar los videos de la secuencia
    const scheduleVideos = group.schedules.map(s => {
      const video = videos.find(v => v.id === s.video_id)
      return video || { id: s.video_id, name: s.video_name }
    })
    setSelectedVideos(scheduleVideos)
    setFormData({
      tv_id: group.tv_id,
      video_ids: scheduleVideos.map(v => v.id),
      start_time: group.start_time,
      end_time: group.end_time || '',
      day_of_week: group.day_of_week !== null ? group.day_of_week.toString() : '',
      is_active: group.is_active === 1,
      loop: group.is_loop === 1
    })
    setShowEditModal(true)
  }

  const handleUpdateSchedule = async (e) => {
    e.preventDefault()
    
    if (selectedVideos.length === 0) {
      alert('Por favor selecciona al menos un video')
      return
    }

    try {
      // Eliminar todas las programaciones del grupo anterior
      if (editingScheduleGroup) {
        for (const schedule of editingScheduleGroup.schedules) {
          await axios.delete(`${apiUrl}/schedules/${schedule.id}`)
        }
      }

      // Crear nuevas programaciones con los videos actualizados
      const daysToSchedule = formData.day_of_week !== '' ? [parseInt(formData.day_of_week)] : [null]
      let createdCount = 0
      
      if (selectedVideos.length > 1 && formData.loop) {
        for (const day of daysToSchedule) {
          let totalDuration = 0
          selectedVideos.forEach(video => {
            totalDuration += video.duration || 0
          })
          
          let endTime = formData.end_time || null
          if (!endTime && totalDuration > 0) {
            const start = new Date(`2000-01-01T${formData.start_time}`)
            const end = new Date(start.getTime() + totalDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }
          
          for (let i = 0; i < selectedVideos.length; i++) {
            const video = selectedVideos[i]
            await axios.post(`${apiUrl}/schedules`, {
              tv_id: formData.tv_id,
              video_id: video.id,
              start_time: formData.start_time,
              end_time: endTime,
              day_of_week: day,
              is_active: formData.is_active ? 1 : 0,
              sequence_order: i,
              is_loop: 1
            })
            createdCount++
          }
        }
      } else if (selectedVideos.length > 1) {
        for (const day of daysToSchedule) {
          let totalDuration = 0
          selectedVideos.forEach(video => {
            totalDuration += video.duration || 0
          })
          
          let endTime = formData.end_time || null
          if (!endTime && totalDuration > 0) {
            const start = new Date(`2000-01-01T${formData.start_time}`)
            const end = new Date(start.getTime() + totalDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }
          
          for (let i = 0; i < selectedVideos.length; i++) {
            const video = selectedVideos[i]
            await axios.post(`${apiUrl}/schedules`, {
              tv_id: formData.tv_id,
              video_id: video.id,
              start_time: formData.start_time,
              end_time: endTime,
              day_of_week: day,
              is_active: formData.is_active ? 1 : 0,
              sequence_order: i,
              is_loop: 0
            })
            createdCount++
          }
        }
      } else {
        for (const day of daysToSchedule) {
          const video = selectedVideos[0]
          const videoDuration = video.duration || 0
          let endTime = formData.end_time || null
          
          if (!endTime && videoDuration > 0) {
            const start = new Date(`2000-01-01T${formData.start_time}`)
            const end = new Date(start.getTime() + videoDuration * 1000)
            endTime = end.toTimeString().slice(0, 5)
          }
          
          await axios.post(`${apiUrl}/schedules`, {
            tv_id: formData.tv_id,
            video_id: video.id,
            start_time: formData.start_time,
            end_time: endTime,
            day_of_week: day,
            is_active: formData.is_active ? 1 : 0
          })
          createdCount++
        }
      }
      
      alert('Programación actualizada exitosamente')
      fetchData()
      setShowEditModal(false)
      setEditingScheduleGroup(null)
      setSelectedVideos([])
      setFormData({
        tv_id: '',
        video_ids: [],
        start_time: '',
        end_time: '',
        day_of_week: '',
        is_active: true,
        loop: false
      })
    } catch (error) {
      console.error('Error updating schedule:', error)
      alert('Error al actualizar la programación')
    }
  }

  const handleDeleteGroup = async (group) => {
    if (!confirm(`¿Estás seguro de eliminar esta programación${group.video_count > 1 ? ` con ${group.video_count} videos` : ''}?`)) return
    
    try {
      for (const schedule of group.schedules) {
        await axios.delete(`${apiUrl}/schedules/${schedule.id}`)
      }
      fetchData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Error al eliminar la programación')
    }
  }

  if (loading) {
    return <div className="card">Cargando...</div>
  }

  const groupedSchedules = groupSchedules(schedules)

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Programación de Videos</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nueva Programación
          </button>
        </div>
        {groupedSchedules.length === 0 ? (
          <p>No hay programaciones. Crea una para comenzar.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>TV</th>
                <th>Videos</th>
                <th>Hora Inicio</th>
                <th>Hora Fin</th>
                <th>Día</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupedSchedules.map(group => (
                <tr key={group.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetails(group)}>
                  <td>{group.tv_name || `TV-${group.tv_id}`}</td>
                  <td>
                    {group.type === 'sequence' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaVideo style={{ color: '#F58342' }} />
                          <span>
                            {group.video_count} video{group.video_count !== 1 ? 's' : ''} 
                            {group.is_loop === 1 && <span style={{ color: '#F58342', marginLeft: '5px' }}>(Loop)</span>}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginLeft: '24px' }}>
                          {(() => {
                            const totalDuration = group.schedules.reduce((sum, s) => {
                              const video = videos.find(v => v.id === s.video_id)
                              return sum + (video?.duration || 0)
                            }, 0)
                            return totalDuration > 0 
                              ? `Duración total: ${Math.floor(totalDuration / 60)}:${String(totalDuration % 60).padStart(2, '0')}`
                              : 'Duración no disponible'
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>{group.video_name}</span>
                        {(() => {
                          const video = videos.find(v => v.id === group.video_id)
                          return video?.duration ? (
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              Duración: {Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}
                  </td>
                  <td>{group.start_time}</td>
                  <td>{group.end_time || 'Sin fin'}</td>
                  <td>{group.day_of_week !== null ? getDayName(group.day_of_week) : 'Todos'}</td>
                  <td>
                    <span className={`badge ${group.is_active === 1 ? 'badge-success' : 'badge-danger'}`}>
                      {group.is_active === 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn"
                      onClick={() => handleEditSchedule(group)}
                      style={{ 
                        marginRight: '10px',
                        background: '#F58342',
                        color: 'white'
                      }}
                    >
                      <FaEdit style={{ marginRight: '5px' }} />
                      Editar
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <FaTrash style={{ marginRight: '5px' }} />
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
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nueva Programación</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>TV</label>
                <select
                  value={formData.tv_id}
                  onChange={(e) => setFormData({...formData, tv_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona una TV</option>
                  {tvs.map(tv => (
                    <option key={tv.id} value={tv.id}>{tv.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Videos (puedes seleccionar múltiples)</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '10px'
                }}>
                  {videos.map(video => {
                    const isSelected = selectedVideos.find(v => v.id === video.id)
                    return (
                      <div
                        key={video.id}
                        onClick={() => toggleVideoSelection(video)}
                        style={{
                          padding: '12px',
                          border: isSelected ? '3px solid #F58342' : '2px solid #ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? '#fff5f0' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{video.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Sin duración'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {selectedVideos.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#f0f4ff', borderRadius: '8px' }}>
                    <strong>Videos seleccionados ({selectedVideos.length}):</strong>
                    <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                      {selectedVideos.map((video, index) => (
                        <li key={video.id} style={{ marginBottom: '4px' }}>
                          {index + 1}. {video.name}
                          {video.duration && (
                            <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                              ({Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {selectedVideos.length > 1 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                        Duración total: {(() => {
                          const total = selectedVideos.reduce((sum, v) => sum + (v.duration || 0), 0)
                          return total > 0 
                            ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
                            : 'No disponible'
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedVideos.length > 1 && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.loop}
                      onChange={(e) => setFormData({...formData, loop: e.target.checked})}
                      style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <strong>Loop</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        Los videos se reproducirán en secuencia y luego volverán al inicio (loop continuo)
                      </div>
                    </div>
                  </label>
                </div>
              )}
              <div className="form-group">
                <label>Hora de Inicio (HH:MM)</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hora de Fin (HH:MM) - Opcional</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Día de la Semana - Opcional (dejar vacío para todos los días)</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
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
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  {' '}Activa
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Programación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Programación */}
      {showDetailModal && selectedScheduleGroup && (
        <div className="modal" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>
                <FaCalendar style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Detalles de Programación
              </h3>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>TV:</strong> {selectedScheduleGroup.tv_name || `TV-${selectedScheduleGroup.tv_id}`}</p>
              <p><strong>Hora Inicio:</strong> {selectedScheduleGroup.start_time}</p>
              <p><strong>Hora Fin:</strong> {selectedScheduleGroup.end_time || 'Sin fin'}</p>
              <p><strong>Día:</strong> {selectedScheduleGroup.day_of_week !== null ? getDayName(selectedScheduleGroup.day_of_week) : 'Todos los días'}</p>
              <p><strong>Estado:</strong> 
                <span className={`badge ${selectedScheduleGroup.is_active === 1 ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '10px' }}>
                  {selectedScheduleGroup.is_active === 1 ? 'Activa' : 'Inactiva'}
                </span>
              </p>
              {selectedScheduleGroup.is_loop === 1 && (
                <p><strong>Loop:</strong> <span style={{ color: '#F58342' }}>Activado</span></p>
              )}
            </div>
            <div>
              <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaVideo style={{ color: '#F58342' }} />
                Videos ({selectedScheduleGroup.video_count})
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '10px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '10px',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                {selectedScheduleGroup.schedules.map((schedule, index) => {
                  const video = videos.find(v => v.id === schedule.video_id)
                  return (
                    <div
                      key={schedule.id}
                      style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ 
                          background: '#F58342', 
                          color: 'white', 
                          borderRadius: '50%', 
                          width: '24px', 
                          height: '24px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </span>
                        <strong>{schedule.video_name || video?.name || 'Video'}</strong>
                        {video?.duration && (
                          <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                            ({Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')})
                          </span>
                        )}
                      </div>
                      {!video?.duration && (
                        <div style={{ fontSize: '11px', color: '#999', marginLeft: '32px', fontStyle: 'italic' }}>
                          Duración no disponible
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn"
                onClick={() => {
                  setShowDetailModal(false)
                  handleEditSchedule(selectedScheduleGroup)
                }}
                style={{ background: '#F58342', color: 'white' }}
              >
                <FaEdit style={{ marginRight: '5px' }} />
                Editar
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Editar Programación</h3>
              <button className="close-btn" onClick={() => {
                setShowEditModal(false)
                setEditingScheduleGroup(null)
                setSelectedVideos([])
              }}>×</button>
            </div>
            <form onSubmit={handleUpdateSchedule}>
              <div className="form-group">
                <label>TV</label>
                <select
                  value={formData.tv_id}
                  onChange={(e) => setFormData({...formData, tv_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona una TV</option>
                  {tvs.map(tv => (
                    <option key={tv.id} value={tv.id}>{tv.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Videos (puedes seleccionar múltiples)</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '10px'
                }}>
                  {videos.map(video => {
                    const isSelected = selectedVideos.find(v => v.id === video.id)
                    return (
                      <div
                        key={video.id}
                        onClick={() => toggleVideoSelection(video)}
                        style={{
                          padding: '12px',
                          border: isSelected ? '3px solid #F58342' : '2px solid #ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? '#fff5f0' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{video.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Sin duración'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {selectedVideos.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#f0f4ff', borderRadius: '8px' }}>
                    <strong>Videos seleccionados ({selectedVideos.length}):</strong>
                    <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                      {selectedVideos.map((video, index) => (
                        <li key={video.id} style={{ marginBottom: '4px' }}>
                          {index + 1}. {video.name}
                          {video.duration && (
                            <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                              ({Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {selectedVideos.length > 1 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                        Duración total: {(() => {
                          const total = selectedVideos.reduce((sum, v) => sum + (v.duration || 0), 0)
                          return total > 0 
                            ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
                            : 'No disponible'
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedVideos.length > 1 && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.loop}
                      onChange={(e) => setFormData({...formData, loop: e.target.checked})}
                      style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <strong>Loop</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        Los videos se reproducirán en secuencia y luego volverán al inicio (loop continuo)
                      </div>
                    </div>
                  </label>
                </div>
              )}
              <div className="form-group">
                <label>Hora de Inicio (HH:MM)</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hora de Fin (HH:MM) - Opcional</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Día de la Semana - Opcional (dejar vacío para todos los días)</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
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
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  {' '}Activa
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowEditModal(false)
                  setEditingScheduleGroup(null)
                  setSelectedVideos([])
                }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
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

