// Configuración del cliente
// Verificar si hay device_id en la URL (para vista previa)
const urlParams = new URLSearchParams(window.location.search);
const urlDeviceId = urlParams.get('device_id');

// Detectar automáticamente la URL del servidor basándose en la URL actual
function getServerUrl() {
    // Si estamos en localhost, usar localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    // Si estamos en producción, usar la misma URL base pero con /api
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${hostname}${port}/api`;
}

const CONFIG = {
    // URL del servidor API (detectada automáticamente)
    SERVER_URL: (function () {
        const url = getServerUrl();
        console.log('🌐 URL del servidor detectada:', url);
        return url;
    })(),

    // ID único del dispositivo (prioridad: URL > localStorage > generar nuevo)
    DEVICE_ID: urlDeviceId || localStorage.getItem('device_id') || generateDeviceId(),

    // Intervalo de sincronización con el servidor (en milisegundos)
    SYNC_INTERVAL: 30000, // 30 segundos (más frecuente para asegurar estado "En línea")

    // Intervalo de verificación de conexión (en milisegundos)
    CONNECTION_CHECK_INTERVAL: 5000, // 5 segundos

    // Tiempo de espera antes de mostrar error (en milisegundos)
    // Tiempo de espera antes de mostrar error (en milisegundos)
    ERROR_TIMEOUT: 10000, // 10 segundos

    // Usar caché de video local (falso para evitar problemas de pantalla negra en algunos dispositivos)
    USE_VIDEO_CACHE: true, // Activado para ahorrar ancho de banda
};

// Generar ID único del dispositivo
function generateDeviceId() {
    const id = 'tv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', id);
    return id;
}

// Guardar device_id en localStorage
localStorage.setItem('device_id', CONFIG.DEVICE_ID);

