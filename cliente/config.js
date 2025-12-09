// Configuración del cliente
const CONFIG = {
    // URL del servidor API
    SERVER_URL: 'http://localhost:3000/api',
    
    // ID único del dispositivo (se genera automáticamente si no existe)
    DEVICE_ID: localStorage.getItem('device_id') || generateDeviceId(),
    
    // Intervalo de sincronización con el servidor (en milisegundos)
    SYNC_INTERVAL: 10000, // 10 segundos (reducido para mayor precisión)
    
    // Intervalo de verificación de conexión (en milisegundos)
    CONNECTION_CHECK_INTERVAL: 5000, // 5 segundos
    
    // Tiempo de espera antes de mostrar error (en milisegundos)
    ERROR_TIMEOUT: 10000, // 10 segundos
};

// Generar ID único del dispositivo
function generateDeviceId() {
    const id = 'tv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', id);
    return id;
}

// Guardar device_id en localStorage
localStorage.setItem('device_id', CONFIG.DEVICE_ID);

