// Configuración del cliente
// Verificar si hay device_id en la URL (para vista previa)
const urlParams = new URLSearchParams(window.location.search);
const urlDeviceId = urlParams.get('device_id');

// Detectar automáticamente la URL del servidor basándose en la URL actual
function getServerUrl() {
    // Si estamos en APK/Capacitor (file:// o capacitor://), usar URL de producción
    if (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:' || window.location.protocol === 'https:') {
        // PRUEBA: Usando servidor local en la red
        // Asegúrate de que el TV esté en la misma red WiFi que tu PC
        // const productionUrl = 'http://192.168.1.173:3000/api';

        // Para producción, usa Railway:
        const productionUrl = 'https://prontotv-production.up.railway.app/api';

        console.log('📱 Modo APK detectado, usando:', productionUrl);
        return productionUrl;
    }

    // Si estamos en localhost, usar localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }

    // Si estamos en producción web, usar la misma URL base pero con /api
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
    SYNC_INTERVAL: 10000, // 10 segundos (reducido para mayor velocidad)

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

