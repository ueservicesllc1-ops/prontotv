import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaCopy, FaExternalLinkAlt, FaCheck } from 'react-icons/fa'

function Videos({ apiUrl }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [copiedUrl, setCopiedUrl] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    duration: '',
    folder: 'videos',
    type: '',
    display_mode: '',
    interval: ''
  })

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${apiUrl}/videos`)
      setVideos(res.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching videos:', error)
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      if (!formData.name) {
        setFormData({ ...formData, name: file.name.replace(/\.[^/.]+$/, '') })
      }
    }
  }

  const handleUpload = async (e) => {
    if (e) e.preventDefault() // Handle form submit event

    if (!selectedFile) {
      alert('Por favor selecciona un archivo')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('video', selectedFile)
      formDataToSend.append('name', formData.name || selectedFile.name)
      if (formData.folder) {
        formDataToSend.append('folder', formData.folder)
      }

      const uploadRes = await axios.post(`${apiUrl}/upload`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percentCompleted)
        }
      })

      // Determinar tipo de contenido
      const url = uploadRes.data.url.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
      const contentType = formData.type || (isImage ? 'image' : 'video');

      // Crear el video en Firebase con la URL de B2 y Bunny CDN
      const bunnyUrl = uploadRes.data.cdnUrl || (uploadRes.data.url && uploadRes.data.url.includes('b-cdn.net') ? uploadRes.data.url : null);
      const b2Url = uploadRes.data.b2Url || uploadRes.data.url;

      await axios.post(`${apiUrl}/videos`, {
        name: formData.name || uploadRes.data.name,
        url: bunnyUrl || b2Url, // URL final (Bunny si está disponible, B2 si no)
        duration: formData.duration ? parseInt(formData.duration) : null,
        type: contentType,
        display_mode: formData.display_mode || null,
        interval: formData.interval ? parseInt(formData.interval) : null
      })

      fetchVideos()
      setShowModal(false)
      setFormData({ name: '', url: '', duration: '', folder: 'videos', type: '', display_mode: '', interval: '' })
      setSelectedFile(null)
      setUploadProgress(0)

      // Mostrar URL de Bunny CDN si está configurado
      const isBunnyCDN = bunnyUrl && bunnyUrl.includes('b-cdn.net')
      const message = isBunnyCDN
        ? `✅ Contenido subido exitosamente!\n\nURL Bunny CDN:\n${bunnyUrl}\n\nURL B2 Original:\n${uploadRes.data.b2Url || uploadRes.data.url}`
        : `✅ Contenido subido exitosamente a B2\n\nURL: ${uploadRes.data.url}`
      alert(message)
    } catch (error) {
      console.error('Error uploading video:', error)
      alert('Error al subir el video: ' + (error.response?.data?.error || error.message))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este video?')) return

    try {
      await axios.delete(`${apiUrl}/videos/${id}`)
      fetchVideos()
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('Error al eliminar el video')
    }
  }

  const handleDetectDuration = async (video) => {
    if (!video.url) {
      alert('El video no tiene URL')
      return
    }

    // Verificar que el servidor esté disponible
    try {
      const healthCheck = await axios.get(`${apiUrl.replace('/api', '')}/api/health`, { timeout: 3000 })
      console.log('✅ Servidor disponible:', healthCheck.data)
    } catch (error) {
      alert(`❌ El servidor no está disponible.\n\nVerifica que el servidor esté corriendo en ${apiUrl.replace('/api', '')}\n\nError: ${error.message}`)
      return
    }

    try {
      console.log(`🔍 Detectando duración para video: ${video.name} (${video.id})`)
      console.log(`📹 URL: ${video.url}`)
      console.log(`🌐 API URL: ${apiUrl}`)

      // Crear un video element temporal para detectar la duración
      const videoElement = document.createElement('video')
      videoElement.preload = 'metadata'
      videoElement.crossOrigin = 'anonymous' // Permitir CORS
      videoElement.muted = true // Necesario para autoplay en algunos navegadores
      videoElement.playsInline = true

      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          videoElement.remove()
          alert('⏱️ Tiempo de espera agotado. El video puede estar tardando en cargar o tener problemas de CORS.')
        }
      }, 30000) // 30 segundos de timeout

      videoElement.onloadedmetadata = async () => {
        if (resolved) return
        resolved = true
        clearTimeout(timeout)

        const duration = Math.floor(videoElement.duration)
        console.log(`⏱️ Duración detectada: ${duration} segundos (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`)

        if (duration && duration > 0 && !isNaN(duration) && isFinite(duration)) {
          try {
            console.log(`📤 Enviando PATCH a: ${apiUrl}/videos/${video.id}`)
            console.log(`📤 Datos:`, { duration })
            const response = await axios.patch(`${apiUrl}/videos/${video.id}`, { duration })
            console.log('✅ Duración actualizada en servidor:', response.data)
            alert(`✅ Duración detectada: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`)
            fetchVideos()
          } catch (error) {
            console.error('❌ Error updating duration:', error)
            console.error('❌ Error response:', error.response)
            console.error('❌ Error status:', error.response?.status)
            console.error('❌ Error data:', error.response?.data)
            console.error('❌ Full error:', error)

            if (error.response?.status === 404) {
              alert(`❌ Video no encontrado en el servidor. ID: ${video.id}\n\nVerifica que:\n1. El servidor esté corriendo\n2. El video exista en Firestore\n3. La URL del API sea correcta: ${apiUrl}`)
            } else {
              alert(`Error al actualizar la duración: ${error.response?.data?.error || error.message}`)
            }
          }
        } else {
          alert('No se pudo detectar la duración del video (duración inválida)')
        }
        videoElement.remove()
      }

      videoElement.oncanplay = () => {
        if (resolved) return
        // Si onloadedmetadata no se disparó, intentar con canplay
        if (videoElement.duration && videoElement.duration > 0 && !isNaN(videoElement.duration) && isFinite(videoElement.duration)) {
          videoElement.onloadedmetadata() // Llamar manualmente
        }
      }

      videoElement.onerror = (e) => {
        if (resolved) return
        resolved = true
        clearTimeout(timeout)
        console.error('❌ Error al cargar video:', e)
        console.error('Video error code:', videoElement.error?.code)
        console.error('Video error message:', videoElement.error?.message)
        alert(`Error al cargar el video para detectar duración. Verifica la consola para más detalles.`)
        videoElement.remove()
      }

      // Establecer src después de configurar los listeners
      videoElement.src = video.url

      // Forzar carga de metadatos
      videoElement.load()
    } catch (error) {
      console.error('❌ Error detecting duration:', error)
      alert(`Error al detectar la duración: ${error.message}`)
    }
  }

  const handleDetectAllDurations = async () => {
    const videosWithoutDuration = videos.filter(v => !v.duration || v.duration === 0)

    if (videosWithoutDuration.length === 0) {
      alert('Todos los videos ya tienen duración')
      return
    }

    if (!confirm(`¿Detectar duración de ${videosWithoutDuration.length} video(s)? Esto puede tomar unos momentos.`)) {
      return
    }

    let successCount = 0
    let failCount = 0

    for (const video of videosWithoutDuration) {
      if (!video.url) {
        failCount++
        continue
      }

      try {
        await new Promise((resolve) => {
          let resolved = false
          const videoElement = document.createElement('video')
          videoElement.preload = 'metadata'
          videoElement.crossOrigin = 'anonymous'
          videoElement.muted = true
          videoElement.playsInline = true

          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true
              failCount++
              videoElement.remove()
              resolve()
            }
          }, 30000) // 30 segundos por video

          videoElement.onloadedmetadata = async () => {
            if (resolved) return
            resolved = true
            clearTimeout(timeout)

            const duration = Math.floor(videoElement.duration)
            if (duration && duration > 0 && !isNaN(duration) && isFinite(duration)) {
              try {
                await axios.patch(`${apiUrl}/videos/${video.id}`, { duration })
                console.log(`✅ Duración detectada para ${video.name}: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`)
                successCount++
              } catch (error) {
                console.error(`❌ Error actualizando ${video.name}:`, error)
                failCount++
              }
            } else {
              failCount++
            }
            videoElement.remove()
            resolve()
          }

          videoElement.oncanplay = () => {
            if (resolved) return
            if (videoElement.duration && videoElement.duration > 0 && !isNaN(videoElement.duration) && isFinite(videoElement.duration)) {
              videoElement.onloadedmetadata()
            }
          }

          videoElement.onerror = () => {
            if (resolved) return
            resolved = true
            clearTimeout(timeout)
            console.error(`❌ Error cargando ${video.name}`)
            failCount++
            videoElement.remove()
            resolve()
          }

          videoElement.src = video.url
          videoElement.load()
        })

        // Pequeña pausa entre videos para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`❌ Error procesando ${video.name}:`, error)
        failCount++
      }
    }

    alert(`✅ Proceso completado:\n${successCount} duración(es) detectada(s)\n${failCount} error(es)`)
    fetchVideos()
  }

  if (loading) {
    return <div className="card">Cargando...</div>
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Gestión de Videos</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {videos.some(v => !v.duration || v.duration === 0) && (
              <button
                className="btn"
                onClick={handleDetectAllDurations}
                style={{ background: '#10b981', color: 'white' }}
                title="Detectar duración de videos sin duración"
              >
                🔍 Detectar Duraciones
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Agregar Video
            </button>
          </div>
        </div>
        {videos.length === 0 ? (
          <p>No hay videos. Agrega uno para comenzar.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>URL (Bunny CDN / B2)</th>
                <th>Duración</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {videos.map(video => {
                const isBunnyCDN = video.url && video.url.includes('b-cdn.net')
                const isB2 = video.url && video.url.includes('backblazeb2.com')

                const copyToClipboard = (url) => {
                  navigator.clipboard.writeText(url).then(() => {
                    setCopiedUrl(video.id)
                    setTimeout(() => setCopiedUrl(null), 2000)
                  })
                }

                return (
                  <tr key={video.id}>
                    <td><strong>{video.name}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: isBunnyCDN ? '#10b981' : (isB2 ? '#F58342' : '#6b7280'),
                            color: 'white'
                          }}>
                            {isBunnyCDN ? '🐰 Bunny CDN' : (isB2 ? '☁️ B2' : '🔗 URL')}
                          </span>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#F58342',
                              textDecoration: 'none',
                              fontSize: '12px',
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={video.url}
                          >
                            {video.url.length > 60 ? video.url.substring(0, 60) + '...' : video.url}
                          </a>
                          <button
                            onClick={() => copyToClipboard(video.url)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: copiedUrl === video.id ? '#10b981' : '#F58342',
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px'
                            }}
                            title="Copiar URL"
                          >
                            {copiedUrl === video.id ? <FaCheck /> : <FaCopy />}
                          </button>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#F58342',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px'
                            }}
                            title="Abrir en nueva pestaña"
                          >
                            <FaExternalLinkAlt />
                          </a>
                        </div>
                        {isBunnyCDN && (
                          <div style={{ fontSize: '11px', color: '#10b981', fontStyle: 'italic' }}>
                            ✅ Reproduciendo desde Bunny CDN
                          </div>
                        )}
                        {isB2 && (
                          <div style={{ fontSize: '11px', color: '#f59e0b', fontStyle: 'italic' }}>
                            ⚠️ Reproduciendo desde B2 directo (configura Bunny CDN)
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {video.duration && video.duration > 0 ? (
                        <span title={`${video.duration} segundos`} style={{ fontWeight: '500' }}>
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>
                          <button
                            onClick={() => handleDetectDuration(video)}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Detectar duración"
                          >
                            🔍 Detectar
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(video.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Agregar Video</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Seleccionar Archivo (Video o Imagen)</label>
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  required
                />
                {selectedFile && (
                  <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                    Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Carpeta en B2 (opcional)</label>
                <input
                  type="text"
                  value={formData.folder}
                  onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                  placeholder="videos"
                />
              </div>
              {uploading && (
                <div className="form-group">
                  <div style={{
                    width: '100%',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '10px'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      backgroundColor: '#F58342',
                      height: '20px',
                      transition: 'width 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {uploadProgress}%
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Nombre del Video</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Video Promocional"
                />
              </div>
              <div className="form-group">
                <label>Tipo de Contenido</label>
                <select
                  value={formData.type || 'auto'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value === 'auto' ? '' : e.target.value })}
                >
                  <option value="auto">Auto-detectar</option>
                  <option value="video">Video</option>
                  <option value="image">Imagen</option>
                </select>
              </div>
              <div className="form-group">
                <label>Modo de Visualización (solo para imágenes)</label>
                <select
                  value={formData.display_mode || ''}
                  onChange={(e) => setFormData({ ...formData, display_mode: e.target.value || null })}
                >
                  <option value="">Imagen única</option>
                  <option value="carousel">Carrusel</option>
                  <option value="random">Aleatorio</option>
                </select>
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Para carrusel/aleatorio, agrega múltiples URLs separadas por comas en el campo URL
                </small>
              </div>
              <div className="form-group">
                <label>Intervalo (ms) - Para carrusel/aleatorio</label>
                <input
                  type="number"
                  value={formData.interval || ''}
                  onChange={(e) => setFormData({ ...formData, interval: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="5000"
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Tiempo entre cambios (5000 = 5 segundos)
                </small>
              </div>
              <div className="form-group">
                <label>Duración (segundos) - Opcional</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="120"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedFile(null)
                    setUploadProgress(0)
                    setUploading(false)
                  }}
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo...' : 'Subir y Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Videos

