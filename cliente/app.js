// Detectar si está corriendo en APK/Android/Capacitor
const isAPK = () => {
    // Verificar si está en Capacitor
    if (window.Capacitor) {
        return true;
    }
    // Verificar si está en Android
    if (navigator.userAgent && navigator.userAgent.includes('Android')) {
        return true;
    }
    // Verificar si el protocolo es file:// o capacitor://
    if (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') {
        return true;
    }
    return false;
};

// Estado de la aplicación
const AppState = {
    currentContent: null,
    contentType: null, // 'video', 'image', 'carousel', 'random'
    isPlaying: false,
    isConnected: false,
    syncInterval: null,
    minuteCheckInterval: null, // Intervalo para verificar cerca de los minutos
    connectionCheckInterval: null,
    retryCount: 0,
    maxRetries: 3,
    carouselImages: [],
    carouselIndex: 0,
    carouselInterval: null,
    randomImages: [],
    randomImageIndex: 0,
    randomImageInterval: null,
    sequenceVideos: [],
    sequenceIndex: 0,
    sequenceInterval: null,
    isAPKMode: isAPK() // Guardar si está en modo APK
};

// Elementos del DOM
const elements = {
    status: document.getElementById('status'),
    statusText: document.getElementById('status-text'),
    splashScreen: document.getElementById('splash-screen'),
    splashMessage: document.getElementById('splash-message'),
    videoContainer: document.getElementById('video-container'),
    videoPlayer: document.getElementById('video-player'),
    carouselContainer: document.getElementById('carousel-container'),
    carouselImage: document.getElementById('carousel-image'),
    carouselIndicators: document.getElementById('carousel-indicators'),
    randomImagesContainer: document.getElementById('random-images-container'),
    randomImage: document.getElementById('random-image'),
    waitingScreen: document.getElementById('waiting-screen'),
    waitingMessage: document.getElementById('waiting-message'),
    errorScreen: document.getElementById('error-screen'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn')
};

// Inicializar aplicación
function init() {
    console.log('🚀 Iniciando ProntoTV Cliente');
    console.log('📱 Device ID:', CONFIG.DEVICE_ID);
    console.log('📦 Modo APK:', AppState.isAPKMode);
    
    // Si está en modo APK, ocultar el botón de activar audio permanentemente
    if (AppState.isAPKMode) {
        const unmuteBtn = document.getElementById('audio-unmute-btn');
        if (unmuteBtn) {
            unmuteBtn.style.display = 'none';
            unmuteBtn.classList.add('hidden');
            console.log('🔇 Botón de activar audio ocultado (modo APK)');
        }
    }
    
    // Verificar si hay parámetro de reproducción directa en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const playUrl = urlParams.get('play');
    const playName = urlParams.get('name');
    
    if (playUrl) {
        console.log('🎬 Modo reproducción directa detectado');
        console.log('📹 URL del video:', playUrl);
        console.log('📝 Nombre:', playName);
        
        // Decodificar URL
        let decodedUrl;
        try {
            decodedUrl = decodeURIComponent(playUrl);
        } catch (e) {
            decodedUrl = playUrl; // Si falla, usar la URL original
        }
        
        console.log('🔗 URL decodificada:', decodedUrl);
        
        // Reproducir video directamente sin esperar al servidor
        const content = {
            url: decodedUrl,
            name: playName ? decodeURIComponent(playName) : 'Video',
            type: 'video',
            allowAudio: true // Marcar para habilitar audio en reproducción directa
        };
        
        // En modo APK, siempre habilitar audio automáticamente
        if (AppState.isAPKMode) {
            content.allowAudio = true;
        }
        
        // Determinar tipo automáticamente
        const urlLower = content.url.toLowerCase();
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlLower)) {
            content.type = 'image';
        }
        
        console.log('📋 Contenido a reproducir:', content);
        
        showSplash('Cargando video...');
        
        // Esperar a que el DOM esté completamente listo
        const startPlayback = () => {
            if (elements.videoPlayer) {
                console.log('✅ DOM listo, iniciando reproducción...');
                
                // Quitar muted del HTML ANTES de reproducir - hacerlo de forma agresiva
                console.log('🔊 Quitando atributo muted del HTML de forma agresiva');
                elements.videoPlayer.muted = false;
                if (elements.videoPlayer.hasAttribute('muted')) {
                    elements.videoPlayer.removeAttribute('muted');
                }
                elements.videoPlayer.volume = 1.0;
                
                // Mostrar botón de activar audio siempre en reproducción directa
                const unmuteBtn = document.getElementById('audio-unmute-btn');
                if (unmuteBtn) {
                    unmuteBtn.classList.remove('hidden');
                    unmuteBtn.style.display = 'block';
                    console.log('🔊 Botón de activar audio mostrado y visible');
                } else {
                    console.error('❌ Botón audio-unmute-btn no encontrado en el DOM');
                }
                
                playContent(content);
            } else {
                console.log('⏳ Esperando DOM...');
                setTimeout(startPlayback, 100);
            }
        };
        
        // Iniciar reproducción después de un breve delay
        setTimeout(startPlayback, 300);
        
        // También registrar dispositivo en segundo plano
        setTimeout(() => {
            registerDevice();
            setupEventListeners();
            startConnectionCheck();
        }, 1000);
        
        return; // No iniciar sincronización normal
    }
    
    // Flujo normal
    // Mostrar splash screen inicialmente
    showSplash('Inicializando...');
    
    // Esperar un momento antes de conectar
    setTimeout(() => {
        registerDevice();
        setupEventListeners();
        startSync();
        startConnectionCheck();
    }, 2000);
}

// Mostrar splash screen
function showSplash(message = 'Cargando...') {
    elements.splashMessage.textContent = message;
    elements.splashScreen.classList.remove('hidden');
    hideAllMedia();
}

// Ocultar splash screen
function hideSplash() {
    elements.splashScreen.classList.add('hidden');
    elements.splashScreen.style.display = 'none';
    elements.splashScreen.style.visibility = 'hidden';
    elements.splashScreen.style.zIndex = '1';
    console.log('🔄 Splash screen ocultado');
}

// Ocultar todos los contenedores de media
function hideAllMedia() {
    elements.videoContainer.classList.add('hidden');
    elements.carouselContainer.classList.add('hidden');
    elements.randomImagesContainer.classList.add('hidden');
    elements.waitingScreen.classList.add('hidden');
    elements.errorScreen.classList.add('hidden');
}

// Registrar dispositivo en el servidor
async function registerDevice() {
    try {
        const response = await fetch(`${CONFIG.SERVER_URL}/tvs/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_id: CONFIG.DEVICE_ID,
                name: `TV-${CONFIG.DEVICE_ID.slice(-6)}`
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Dispositivo registrado:', data);
            updateConnectionStatus(true);
            AppState.retryCount = 0;
            hideSplash();
        } else {
            throw new Error('Error al registrar dispositivo');
        }
    } catch (error) {
        console.error('❌ Error al registrar dispositivo:', error);
        updateConnectionStatus(false);
        showError('No se pudo conectar al servidor');
    }
}

// Obtener programación actual del servidor
async function fetchPlayback() {
    try {
        const response = await fetch(`${CONFIG.SERVER_URL}/client/playback/${CONFIG.DEVICE_ID}`);
        
        if (!response.ok) {
            throw new Error('Error al obtener programación');
        }
        
        const data = await response.json();
        
        console.log('📺 Respuesta del servidor:', {
            hasContent: !!data.content,
            contentType: data.content?.type,
            contentUrl: data.content?.url,
            contentName: data.content?.name,
            schedule: data.schedule,
            fullResponse: data
        });
        
        // Log detallado del contenido
        if (data.content) {
            console.log('📋 Detalles del contenido:', JSON.stringify(data.content, null, 2));
        }
        
        if (data.content) {
            console.log('✅ Contenido recibido, iniciando reproducción...');
            // Hay contenido programado
            const isDifferent = AppState.currentContent?.url !== data.content.url || 
                AppState.contentType !== data.content.type ||
                (data.content.type === 'sequence' && JSON.stringify(AppState.currentContent?.videos) !== JSON.stringify(data.content.videos));
            
            console.log('🔍 Comparación de contenido:', {
                currentUrl: AppState.currentContent?.url,
                newUrl: data.content.url,
                currentType: AppState.contentType,
                newType: data.content.type,
                isDifferent: isDifferent
            });
            
            if (isDifferent) {
                // Cambiar de contenido
                console.log('🔄 Contenido diferente, reproduciendo...');
                playContent(data.content);
            } else {
                console.log('⏸️ Contenido igual, no se cambia');
                // Si el contenido es el mismo pero no se está reproduciendo, forzar reproducción
                if (!AppState.isPlaying && data.content.type === 'video') {
                    console.log('⚠️ Contenido igual pero no se está reproduciendo, forzando reproducción...');
                    playContent(data.content);
                } else if (data.content.type === 'video' && elements.videoPlayer) {
                    // Verificar si el video está pausado o terminado y reiniciarlo
                    if (elements.videoPlayer.paused || elements.videoPlayer.ended) {
                        console.log('🔄 Video pausado o terminado, reiniciando...');
                        elements.videoPlayer.currentTime = 0;
                        elements.videoPlayer.play().catch(error => {
                            console.error('❌ Error al reiniciar video:', error);
                        });
                    }
                    // Asegurar que el contenedor esté visible
                    elements.videoContainer.classList.remove('hidden');
                    elements.videoContainer.style.display = 'flex';
                    elements.splashScreen.classList.add('hidden');
                }
            }
            updateConnectionStatus(true);
            hideError();
            hideSplash();
        } else {
            // No hay contenido programado
            console.log('⚠️ No hay contenido programado para este momento');
            if (AppState.currentContent) {
                // Detener contenido actual
                console.log('🛑 Deteniendo contenido actual');
                stopContent();
            }
            showWaiting('No hay contenido programado para este momento');
        }
        
        AppState.retryCount = 0;
    } catch (error) {
        console.error('❌ Error al obtener programación:', error);
        AppState.retryCount++;
        
        if (AppState.retryCount >= AppState.maxRetries) {
            updateConnectionStatus(false);
            showError('Error de conexión. Verificando...');
        }
    }
}

// Reproducir contenido
function playContent(content) {
    console.log('▶️ Reproduciendo contenido:', {
        name: content.name,
        type: content.type,
        url: content.url,
        fullContent: content
    });
    
    // En modo APK, siempre habilitar audio automáticamente
    if (AppState.isAPKMode && !content.allowAudio) {
        content.allowAudio = true;
        console.log('📦 Modo APK: Audio habilitado automáticamente');
    }
    
    AppState.currentContent = content;
    AppState.contentType = content.type;
    
    hideAllMedia();
    stopAllIntervals();
    
    console.log('🎯 Tipo de contenido:', content.type);
    
    switch (content.type) {
        case 'video':
            console.log('📹 Llamando a playVideo...');
            playVideo(content);
            break;
        case 'image':
            console.log('🖼️ Llamando a playImage...');
            playImage(content);
            break;
        case 'carousel':
            console.log('🎠 Llamando a playCarousel...');
            playCarousel(content);
            break;
        case 'random':
            console.log('🎲 Llamando a playRandomImages...');
            playRandomImages(content);
            break;
        case 'sequence':
            console.log('📺 Llamando a playSequence...');
            playSequence(content);
            break;
        default:
            console.warn('⚠️ Tipo de contenido desconocido:', content.type);
            console.warn('Contenido completo:', content);
    }
}

// Reproducir video
function playVideo(content) {
    console.log('🎬 ========== INICIANDO REPRODUCCIÓN DE VIDEO ==========');
    console.log('🎬 Iniciando reproducción de video:', {
        url: content.url,
        name: content.name,
        type: content.type,
        fullContent: content
    });
    
    // Verificar que el elemento existe
    if (!elements.videoPlayer) {
        console.error('❌ Elemento videoPlayer no encontrado');
        showError('Error: reproductor de video no encontrado');
        return;
    }
    
    // Verificar que hay URL
    if (!content.url) {
        console.error('❌ No hay URL en el contenido');
        showError('Error: no hay URL de video');
        return;
    }
    
    console.log('📹 Estableciendo src del video:', content.url);
    
    // Verificar si el botón existe
    const unmuteBtn = document.getElementById('audio-unmute-btn');
    if (!unmuteBtn) {
        console.error('❌ Botón audio-unmute-btn no encontrado en el DOM');
    } else {
        console.log('✅ Botón audio-unmute-btn encontrado en el DOM');
    }
    
    // Habilitar audio si viene de reproducción directa
    if (content.allowAudio) {
        console.log('🔊 Habilitando audio para reproducción directa');
        // Quitar muted ANTES de establecer src - hacerlo de múltiples formas
        elements.videoPlayer.muted = false;
        elements.videoPlayer.removeAttribute('muted');
        // También quitar desde el elemento HTML directamente
        if (elements.videoPlayer.hasAttribute('muted')) {
            elements.videoPlayer.removeAttribute('muted');
        }
        // Asegurar que el volumen esté al máximo
        elements.videoPlayer.volume = 1.0;
        
        // Mostrar botón siempre para reproducción directa
        if (unmuteBtn) {
            unmuteBtn.classList.remove('hidden');
            unmuteBtn.style.display = 'block';
            unmuteBtn.style.visibility = 'visible';
            unmuteBtn.style.opacity = '1';
            console.log('🔊 Botón mostrado (reproducción directa)');
        }
        
        // Agregar evento de click para activar audio si el navegador lo bloquea
        const enableAudioOnClick = () => {
            if (elements.videoPlayer.muted) {
                console.log('🔊 Activando audio por interacción del usuario');
                elements.videoPlayer.muted = false;
                elements.videoPlayer.removeAttribute('muted');
                elements.videoPlayer.volume = 1.0;
                document.removeEventListener('click', enableAudioOnClick);
                document.removeEventListener('touchstart', enableAudioOnClick);
            }
        };
        document.addEventListener('click', enableAudioOnClick, { once: true });
        document.addEventListener('touchstart', enableAudioOnClick, { once: true });
        
        console.log('📊 Estado inicial de audio:', {
            muted: elements.videoPlayer.muted,
            volume: elements.videoPlayer.volume,
            hasMutedAttribute: elements.videoPlayer.hasAttribute('muted')
        });
    } else {
        // Para programaciones normales, mantener muted pero mostrar botón para que el usuario pueda activarlo
        elements.videoPlayer.muted = true;
        
        // Mostrar botón para que el usuario pueda activar audio si quiere
        if (unmuteBtn) {
            unmuteBtn.classList.remove('hidden');
            unmuteBtn.style.display = 'block';
            unmuteBtn.style.visibility = 'visible';
            unmuteBtn.style.opacity = '1';
            console.log('🔊 Botón mostrado (programación normal - usuario puede activar audio)');
        }
    }
    
    // Ocultar otros contenedores PRIMERO
    elements.splashScreen.classList.add('hidden');
    elements.splashScreen.style.display = 'none';
    elements.splashScreen.style.visibility = 'hidden';
    elements.splashScreen.style.zIndex = '1';
    elements.waitingScreen.classList.add('hidden');
    elements.errorScreen.classList.add('hidden');
    elements.carouselContainer.classList.add('hidden');
    elements.randomImagesContainer.classList.add('hidden');
    
    // FORZAR que el contenedor esté visible ANTES de cargar el video
    elements.videoContainer.classList.remove('hidden');
    elements.videoContainer.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 50 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
    `;
    
    // FORZAR que el video player esté visible
    elements.videoPlayer.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 51 !important;
        width: 100vw !important;
        height: 100vh !important;
        min-width: 100vw !important;
        min-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
    `;
    
    // IMPORTANTE: Quitar muted ANTES de establecer src para que funcione
    if (content.allowAudio) {
        console.log('🔊 Quitando muted ANTES de establecer src');
        elements.videoPlayer.muted = false;
        elements.videoPlayer.removeAttribute('muted');
        elements.videoPlayer.volume = 1.0;
        // Forzar que no tenga el atributo en el DOM
        if (elements.videoPlayer.getAttribute('muted') !== null) {
            elements.videoPlayer.removeAttribute('muted');
        }
    }
    
    // Establecer src del video
    elements.videoPlayer.src = content.url;
    
    // Mostrar botón de activar audio si es reproducción directa
    if (content.allowAudio) {
        const unmuteBtn = document.getElementById('audio-unmute-btn');
        if (unmuteBtn) {
            unmuteBtn.classList.remove('hidden');
            console.log('🔊 Botón de activar audio mostrado');
        }
    }
    
    console.log('📺 Contenedor de video visible:', {
        containerHidden: elements.videoContainer.classList.contains('hidden'),
        containerDisplay: window.getComputedStyle(elements.videoContainer).display,
        videoSrc: elements.videoPlayer.src,
        videoVisible: window.getComputedStyle(elements.videoPlayer).display !== 'none',
        muted: elements.videoPlayer.muted,
        volume: elements.videoPlayer.volume
    });
    
    // Event listeners para debug
    elements.videoPlayer.onloadstart = () => {
        console.log('🔄 Video: carga iniciada');
    };
    
    elements.videoPlayer.onloadedmetadata = () => {
        console.log('✅ Video: metadatos cargados', {
            duration: elements.videoPlayer.duration,
            videoWidth: elements.videoPlayer.videoWidth,
            videoHeight: elements.videoPlayer.videoHeight
        });
        
        // Asegurar audio después de cargar metadatos
        if (content.allowAudio) {
            console.log('🔊 Habilitando audio después de cargar metadatos');
            elements.videoPlayer.muted = false;
            elements.videoPlayer.removeAttribute('muted');
            elements.videoPlayer.volume = 1.0;
            console.log('📊 Estado de audio:', {
                muted: elements.videoPlayer.muted,
                volume: elements.videoPlayer.volume
            });
        }
    };
    
    elements.videoPlayer.onloadeddata = () => {
        console.log('✅ Video: datos cargados, listo para reproducir');
    };
    
    elements.videoPlayer.oncanplay = () => {
        console.log('✅ Video: puede reproducirse');
        // FORZAR visibilidad cuando el video puede reproducirse
        elements.splashScreen.classList.add('hidden');
        elements.splashScreen.style.cssText = 'display: none !important; visibility: hidden !important; z-index: 1 !important;';
        
        elements.videoContainer.classList.remove('hidden');
        elements.videoContainer.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 50 !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
        `;
    };
    
    elements.videoPlayer.oncanplaythrough = () => {
        console.log('✅ Video: puede reproducirse completamente');
        // FORZAR visibilidad cuando el video está completamente listo
        elements.splashScreen.classList.add('hidden');
        elements.splashScreen.style.cssText = 'display: none !important; visibility: hidden !important; z-index: 1 !important;';
        
        elements.videoContainer.classList.remove('hidden');
        elements.videoContainer.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 50 !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
        `;
    };
    
    // Forzar carga del video
    console.log('🔄 Cargando video...');
    elements.videoPlayer.load();
    
    // Intentar reproducir cuando el video esté listo
    const tryPlay = () => {
        console.log('▶️ Intentando reproducir video...');
        console.log('📊 Estado antes de reproducir:', {
            readyState: elements.videoPlayer.readyState,
            networkState: elements.videoPlayer.networkState,
            paused: elements.videoPlayer.paused
        });
        
        // Asegurar audio antes de reproducir
        if (content.allowAudio) {
            console.log('🔊 Habilitando audio antes de reproducir');
            elements.videoPlayer.muted = false;
            elements.videoPlayer.removeAttribute('muted');
            elements.videoPlayer.volume = 1.0;
        }
        
        elements.videoPlayer.play().then(() => {
            console.log('✅ Video iniciado correctamente');
            console.log('📊 Estado del video:', {
                paused: elements.videoPlayer.paused,
                ended: elements.videoPlayer.ended,
                readyState: elements.videoPlayer.readyState,
                networkState: elements.videoPlayer.networkState,
                currentTime: elements.videoPlayer.currentTime,
                duration: elements.videoPlayer.duration,
                muted: elements.videoPlayer.muted,
                volume: elements.videoPlayer.volume
            });
            
            // FORZAR visibilidad del contenedor y video
            elements.splashScreen.classList.add('hidden');
            elements.splashScreen.style.cssText = 'display: none !important; visibility: hidden !important; z-index: 1 !important;';
            
            elements.videoContainer.classList.remove('hidden');
            elements.videoContainer.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 50 !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
            `;
            
            elements.videoPlayer.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 51 !important;
                width: 100vw !important;
                height: 100vh !important;
                min-width: 100vw !important;
                min-height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
            `;
            
            console.log('📺 Verificando visibilidad:', {
                containerDisplay: window.getComputedStyle(elements.videoContainer).display,
                containerVisibility: window.getComputedStyle(elements.videoContainer).visibility,
                containerZIndex: window.getComputedStyle(elements.videoContainer).zIndex,
                videoDisplay: window.getComputedStyle(elements.videoPlayer).display,
                videoVisibility: window.getComputedStyle(elements.videoPlayer).visibility,
                videoWidth: window.getComputedStyle(elements.videoPlayer).width,
                videoHeight: window.getComputedStyle(elements.videoPlayer).height,
                splashDisplay: window.getComputedStyle(elements.splashScreen).display,
                splashZIndex: window.getComputedStyle(elements.splashScreen).zIndex
            });
        }).catch(error => {
            console.error('❌ Error al reproducir video:', error);
            console.error('URL del video:', content.url);
            console.error('Tipo de error:', error.name, error.message);
            // Intentar de nuevo después de un delay
            setTimeout(() => {
                console.log('🔄 Reintentando reproducción...');
                elements.videoPlayer.play().catch(err => {
                    console.error('❌ Error en segundo intento:', err);
                    showError('Error al reproducir el video: ' + err.message);
                });
            }, 1000);
        });
    };
    
    // Intentar reproducir cuando el video pueda reproducirse
    if (elements.videoPlayer.readyState >= 3) {
        // Ya tiene suficientes datos
        setTimeout(tryPlay, 100);
    } else {
        // Esperar a que tenga suficientes datos
        elements.videoPlayer.oncanplay = () => {
            console.log('✅ Video listo para reproducir (canplay)');
            tryPlay();
        };
        
        // Fallback: intentar después de un timeout
        setTimeout(() => {
            if (elements.videoPlayer.paused) {
                console.log('⏱️ Timeout: intentando reproducir de todas formas...');
                tryPlay();
            }
        }, 2000);
    }
    
    AppState.isPlaying = true;
    
    // Limpiar event listeners anteriores para evitar duplicados
    elements.videoPlayer.onended = null;
    elements.videoPlayer.onerror = null;
    
    elements.videoPlayer.onended = () => {
        console.log('⏹️ Video finalizado');
        console.log('📊 Estado al finalizar:', {
            duration: elements.videoPlayer.duration,
            currentTime: elements.videoPlayer.currentTime,
            readyState: elements.videoPlayer.readyState
        });
        
        // Si es parte de una secuencia, el manejo se hace en playNextInSequence
        if (AppState.contentType === 'sequence') {
            console.log('📺 Video de secuencia terminado, manejado por playNextInSequence');
            return;
        }
        
        // Si el contenido actual tiene loop, volver a reproducir
        if (AppState.currentContent && AppState.currentContent.url && AppState.currentContent.loop) {
            console.log('🔄 Video terminado, reiniciando reproducción (loop activo)...');
            // Reiniciar el mismo video
            elements.videoPlayer.currentTime = 0;
            elements.videoPlayer.play().then(() => {
                console.log('✅ Video reiniciado correctamente');
            }).catch(error => {
                console.error('❌ Error al reiniciar video:', error);
                // Si falla, consultar servidor para nuevo contenido
                fetchPlayback();
            });
        } else {
            // Si no hay loop, consultar servidor para siguiente contenido
            console.log('✅ Video terminado (sin loop), buscando siguiente programación');
            fetchPlayback();
        }
    };
    
    elements.videoPlayer.onerror = (e) => {
        console.error('❌ Error en el video:', e);
        console.error('Error code:', elements.videoPlayer.error);
        if (elements.videoPlayer.error) {
            console.error('Error details:', {
                code: elements.videoPlayer.error.code,
                message: elements.videoPlayer.error.message
            });
        }
        console.error('Video src:', elements.videoPlayer.src);
        console.error('Video currentSrc:', elements.videoPlayer.currentSrc);
        showError('Error al cargar el video. Verifica la URL.');
    };
    
    elements.videoPlayer.onstalled = () => {
        console.warn('⚠️ Video: descarga estancada - reintentando...');
        // Reintentar carga si se estanca
        setTimeout(() => {
            if (elements.videoPlayer.networkState === 3) {
                elements.videoPlayer.load();
            }
        }, 2000);
    };
    
    elements.videoPlayer.onsuspend = () => {
        console.warn('⚠️ Video: descarga suspendida (normal durante carga)');
    };
    
    elements.videoPlayer.onwaiting = () => {
        console.warn('⚠️ Video: esperando datos (normal durante carga)');
    };
    
    elements.videoPlayer.onplaying = () => {
        console.log('▶️ Video: reproduciendo activamente');
        
        // Verificar estado de audio y mostrar botón si está muted
        const checkAudioAndShowButton = () => {
            const unmuteBtn = document.getElementById('audio-unmute-btn');
            if (!unmuteBtn) {
                console.error('❌ Botón audio-unmute-btn no existe en el DOM');
                return;
            }
            
            // Verificar si el video está muted
            const isMuted = elements.videoPlayer.muted || elements.videoPlayer.hasAttribute('muted');
            
            console.log('📊 Verificación de audio:', {
                muted: elements.videoPlayer.muted,
                hasMutedAttr: elements.videoPlayer.hasAttribute('muted'),
                volume: elements.videoPlayer.volume,
                isMuted: isMuted,
                allowAudio: content.allowAudio
            });
            
            // En modo APK, nunca mostrar el botón
            if (AppState.isAPKMode) {
                unmuteBtn.style.display = 'none';
                unmuteBtn.classList.add('hidden');
                console.log('🔇 Botón ocultado (modo APK)');
            }
            // En navegador, mostrar botón si está muted o es reproducción directa
            else if (isMuted || content.allowAudio) {
                unmuteBtn.classList.remove('hidden');
                unmuteBtn.style.display = 'block';
                unmuteBtn.style.visibility = 'visible';
                unmuteBtn.style.opacity = '1';
                unmuteBtn.style.zIndex = '1000';
                console.log('🔊 Botón de activar audio MOSTRADO - Estado:', {
                    isMuted: isMuted,
                    allowAudio: content.allowAudio,
                    display: window.getComputedStyle(unmuteBtn).display,
                    visibility: window.getComputedStyle(unmuteBtn).visibility,
                    opacity: window.getComputedStyle(unmuteBtn).opacity
                });
            } else {
                // Solo ocultar si realmente no está muted y no es reproducción directa
                unmuteBtn.classList.add('hidden');
                console.log('🔇 Botón de activar audio ocultado (audio activo)');
            }
        };
        
        // Verificar inmediatamente
        checkAudioAndShowButton();
        
        // Verificar de nuevo después de un momento
        setTimeout(checkAudioAndShowButton, 500);
        setTimeout(checkAudioAndShowButton, 1500);
        
        // En modo APK, siempre habilitar audio automáticamente
        if (AppState.isAPKMode) {
            console.log('📦 Modo APK: Habilitando audio automáticamente');
            elements.videoPlayer.muted = false;
            elements.videoPlayer.removeAttribute('muted');
            elements.videoPlayer.volume = 1.0;
        }
        // Asegurar audio cuando empieza a reproducir (solo si es reproducción directa en navegador)
        else if (content.allowAudio) {
            console.log('🔊 Habilitando audio para reproducción directa');
            elements.videoPlayer.muted = false;
            elements.videoPlayer.removeAttribute('muted');
            elements.videoPlayer.volume = 1.0;
        }
        
        // FORZAR visibilidad del contenedor y video
        elements.splashScreen.classList.add('hidden');
        elements.splashScreen.style.display = 'none';
        elements.splashScreen.style.visibility = 'hidden';
        elements.splashScreen.style.zIndex = '1';
        
        elements.videoContainer.classList.remove('hidden');
        elements.videoContainer.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 50 !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
        `;
        
        elements.videoPlayer.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 51 !important;
            width: 100vw !important;
            height: 100vh !important;
            min-width: 100vw !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
        `;
        
        elements.waitingScreen.classList.add('hidden');
        elements.errorScreen.classList.add('hidden');
        
        // Verificar visibilidad final
        const containerStyle = window.getComputedStyle(elements.videoContainer);
        const videoStyle = window.getComputedStyle(elements.videoPlayer);
        const splashStyle = window.getComputedStyle(elements.splashScreen);
        
        // Verificar dimensiones del video
        const videoWidth = elements.videoPlayer.videoWidth;
        const videoHeight = elements.videoPlayer.videoHeight;
        const videoRect = elements.videoPlayer.getBoundingClientRect();
        const containerRect = elements.videoContainer.getBoundingClientRect();
        
        console.log('📺 Estado final de visibilidad:', {
            containerDisplay: containerStyle.display,
            containerVisibility: containerStyle.visibility,
            containerOpacity: containerStyle.opacity,
            containerZIndex: containerStyle.zIndex,
            containerWidth: containerStyle.width,
            containerHeight: containerStyle.height,
            containerRect: { x: containerRect.x, y: containerRect.y, width: containerRect.width, height: containerRect.height },
            videoDisplay: videoStyle.display,
            videoVisibility: videoStyle.visibility,
            videoWidth: videoStyle.width,
            videoHeight: videoStyle.height,
            videoSrc: elements.videoPlayer.src,
            videoNativeWidth: videoWidth,
            videoNativeHeight: videoHeight,
            videoRect: { x: videoRect.x, y: videoRect.y, width: videoRect.width, height: videoRect.height },
            splashDisplay: splashStyle.display,
            splashZIndex: splashStyle.zIndex,
            bodyOverflow: window.getComputedStyle(document.body).overflow,
            htmlOverflow: window.getComputedStyle(document.documentElement).overflow
        });
        
        // Verificar que el video realmente se está reproduciendo
        console.log('🎬 Estado de reproducción:', {
            paused: elements.videoPlayer.paused,
            ended: elements.videoPlayer.ended,
            currentTime: elements.videoPlayer.currentTime,
            duration: elements.videoPlayer.duration,
            readyState: elements.videoPlayer.readyState
        });
        
        // Si el video tiene dimensiones 0, hay un problema
        if (videoRect.width === 0 || videoRect.height === 0) {
            console.error('❌ PROBLEMA: Video tiene dimensiones 0!', {
                videoRect,
                videoWidth,
                videoHeight,
                containerRect
            });
            
            // Intentar forzar dimensiones
            elements.videoPlayer.style.width = '100vw';
            elements.videoPlayer.style.height = '100vh';
            elements.videoPlayer.style.minWidth = '100vw';
            elements.videoPlayer.style.minHeight = '100vh';
        }
    };
    
    elements.videoPlayer.onprogress = () => {
        if (elements.videoPlayer.buffered.length > 0) {
            const bufferedEnd = elements.videoPlayer.buffered.end(elements.videoPlayer.buffered.length - 1);
            const duration = elements.videoPlayer.duration;
            if (duration > 0) {
                const percentBuffered = (bufferedEnd / duration) * 100;
                if (percentBuffered > 10) {
                    console.log(`📊 Video: ${percentBuffered.toFixed(1)}% cargado`);
                }
            }
        }
    };
}

// Reproducir imagen única
function playImage(content) {
    elements.randomImage.src = content.url;
    elements.randomImagesContainer.classList.remove('hidden');
    
    // Cambiar imagen después de un tiempo
    if (content.duration) {
        setTimeout(() => {
            fetchPlayback();
        }, content.duration * 1000);
    }
}

// Reproducir carrusel de imágenes
function playCarousel(content) {
    if (!content.images || content.images.length === 0) {
        console.warn('No hay imágenes para el carrusel');
        return;
    }
    
    // Normalizar formato de imágenes (puede ser array de strings o array de objetos)
    AppState.carouselImages = content.images.map(img => {
        if (typeof img === 'string') {
            return { url: img };
        }
        return img;
    });
    AppState.carouselIndex = 0;
    
    elements.carouselContainer.classList.remove('hidden');
    
    // Crear indicadores
    createCarouselIndicators();
    
    // Mostrar primera imagen
    showCarouselImage(0);
    
    // Cambiar imagen automáticamente
    const interval = content.interval || 5000; // 5 segundos por defecto
    AppState.carouselInterval = setInterval(() => {
        AppState.carouselIndex = (AppState.carouselIndex + 1) % AppState.carouselImages.length;
        showCarouselImage(AppState.carouselIndex);
    }, interval);
}

// Mostrar imagen del carrusel
function showCarouselImage(index) {
    if (index >= 0 && index < AppState.carouselImages.length) {
        const image = AppState.carouselImages[index];
        const imageUrl = typeof image === 'string' ? image : image.url;
        elements.carouselImage.src = imageUrl;
        
        // Actualizar indicadores
        updateCarouselIndicators(index);
    }
}

// Crear indicadores del carrusel
function createCarouselIndicators() {
    elements.carouselIndicators.innerHTML = '';
    
    AppState.carouselImages.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'carousel-indicator';
        if (index === 0) indicator.classList.add('active');
        indicator.addEventListener('click', () => {
            AppState.carouselIndex = index;
            showCarouselImage(index);
        });
        elements.carouselIndicators.appendChild(indicator);
    });
}

// Actualizar indicadores del carrusel
function updateCarouselIndicators(activeIndex) {
    const indicators = elements.carouselIndicators.querySelectorAll('.carousel-indicator');
    indicators.forEach((indicator, index) => {
        if (index === activeIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Reproducir imágenes aleatorias
function playRandomImages(content) {
    if (!content.images || content.images.length === 0) {
        console.warn('No hay imágenes aleatorias');
        return;
    }
    
    // Normalizar formato de imágenes (puede ser array de strings o array de objetos)
    AppState.randomImages = content.images.map(img => {
        if (typeof img === 'string') {
            return { url: img };
        }
        return img;
    });
    AppState.randomImageIndex = Math.floor(Math.random() * AppState.randomImages.length);
    
    elements.randomImagesContainer.classList.remove('hidden');
    
    // Mostrar primera imagen aleatoria
    showRandomImage();
    
    // Cambiar imagen aleatoriamente
    const interval = content.interval || 10000; // 10 segundos por defecto
    AppState.randomImageInterval = setInterval(() => {
        // Seleccionar imagen aleatoria diferente
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * AppState.randomImages.length);
        } while (newIndex === AppState.randomImageIndex && AppState.randomImages.length > 1);
        
        AppState.randomImageIndex = newIndex;
        showRandomImage();
    }, interval);
}

// Mostrar imagen aleatoria
function showRandomImage() {
    if (AppState.randomImageIndex >= 0 && AppState.randomImageIndex < AppState.randomImages.length) {
        const image = AppState.randomImages[AppState.randomImageIndex];
        const imageUrl = typeof image === 'string' ? image : image.url;
        elements.randomImage.src = imageUrl;
    }
}

// Detener todo el contenido
function stopContent() {
    console.log('🛑 Deteniendo contenido');
    AppState.isPlaying = false;
    AppState.currentContent = null;
    AppState.contentType = null;
    
    if (elements.videoPlayer) {
        console.log('🛑 Pausando y limpiando video player');
        elements.videoPlayer.pause();
        elements.videoPlayer.src = '';
        elements.videoPlayer.onended = null;
        elements.videoPlayer.onerror = null;
    }
    AppState.contentType = null;
    AppState.isPlaying = false;
    
    stopAllIntervals();
    hideAllMedia();
}

// Reproducir secuencia de videos
function playSequence(content) {
    if (!content.videos || content.videos.length === 0) {
        console.warn('No hay videos en la secuencia');
        return;
    }
    
    console.log(`📺 Iniciando secuencia de ${content.videos.length} videos, loop: ${content.loop}`);
    
    AppState.sequenceVideos = content.videos;
    AppState.sequenceIndex = 0;
    
    elements.videoContainer.classList.remove('hidden');
    
    // IMPORTANTE: Quitar loop del video HTML individual - el loop se maneja a nivel de secuencia
    // Esto es crítico para que las secuencias sin loop no se repitan infinitamente
    elements.videoPlayer.removeAttribute('loop');
    elements.videoPlayer.loop = false;
    
    // Asegurar que el video no tenga loop incluso si el HTML lo tiene por defecto
    if (elements.videoPlayer.hasAttribute('loop')) {
        elements.videoPlayer.removeAttribute('loop');
    }
    
    console.log('🔍 Estado del video player:', {
        hasLoopAttribute: elements.videoPlayer.hasAttribute('loop'),
        loopProperty: elements.videoPlayer.loop,
        sequenceLoop: content.loop
    });
    
    // Reproducir primer video
    playNextInSequence();
}

// Reproducir siguiente video en la secuencia
function playNextInSequence() {
    if (AppState.sequenceIndex >= AppState.sequenceVideos.length) {
        // Si es loop, volver al inicio
        if (AppState.currentContent?.loop) {
            console.log('🔄 Secuencia en loop, volviendo al inicio');
            AppState.sequenceIndex = 0;
        } else {
            // Fin de secuencia sin loop, buscar siguiente programación
            console.log('✅ Secuencia terminada (sin loop), buscando siguiente programación');
            AppState.sequenceVideos = [];
            AppState.sequenceIndex = 0;
            fetchPlayback();
            return;
        }
    }
    
    const video = AppState.sequenceVideos[AppState.sequenceIndex];
    console.log(`▶️ Reproduciendo video ${AppState.sequenceIndex + 1}/${AppState.sequenceVideos.length} de la secuencia:`, video.name);
    
    // Asegurar que el video NO tenga loop antes de establecer src
    elements.videoPlayer.removeAttribute('loop');
    elements.videoPlayer.loop = false;
    
    elements.videoPlayer.src = video.url;
    
    elements.videoPlayer.play().catch(error => {
        console.error('❌ Error al reproducir video en secuencia:', error);
        // Intentar siguiente video
        AppState.sequenceIndex++;
        playNextInSequence();
    });
    
    AppState.isPlaying = true;
    
    // Limpiar event listeners anteriores
    elements.videoPlayer.onended = null;
    elements.videoPlayer.onerror = null;
    
    elements.videoPlayer.onended = () => {
        console.log(`⏹️ Video ${AppState.sequenceIndex + 1} terminado`);
        AppState.sequenceIndex++;
        
        // Verificar si hay más videos en la secuencia
        if (AppState.sequenceIndex < AppState.sequenceVideos.length) {
            // Hay más videos, continuar con el siguiente
            console.log(`▶️ Continuando con siguiente video (${AppState.sequenceIndex + 1}/${AppState.sequenceVideos.length})`);
            playNextInSequence();
        } else {
            // No hay más videos
            if (AppState.currentContent?.loop) {
                // Si hay loop, volver al inicio
                console.log('🔄 Secuencia completa, volviendo al inicio (loop activo)');
                AppState.sequenceIndex = 0;
                playNextInSequence();
            } else {
                // Sin loop, terminar secuencia y buscar siguiente programación
                console.log('✅ Secuencia completa (sin loop), buscando siguiente programación');
                AppState.sequenceVideos = [];
                AppState.sequenceIndex = 0;
                AppState.currentContent = null;
                AppState.contentType = null;
                fetchPlayback();
            }
        }
    };
    
    elements.videoPlayer.onerror = () => {
        console.error('❌ Error en video de secuencia, saltando...');
        AppState.sequenceIndex++;
        playNextInSequence();
    };
}

// Detener todos los intervalos
function stopAllIntervals() {
    if (AppState.carouselInterval) {
        clearInterval(AppState.carouselInterval);
        AppState.carouselInterval = null;
    }
    if (AppState.randomImageInterval) {
        clearInterval(AppState.randomImageInterval);
        AppState.randomImageInterval = null;
    }
    if (AppState.sequenceInterval) {
        clearInterval(AppState.sequenceInterval);
        AppState.sequenceInterval = null;
    }
    if (AppState.minuteCheckInterval) {
        clearInterval(AppState.minuteCheckInterval);
        AppState.minuteCheckInterval = null;
    }
}

// Mostrar pantalla de espera
function showWaiting(message = 'Esperando contenido...') {
    elements.waitingMessage.textContent = message;
    elements.waitingScreen.classList.remove('hidden');
    hideAllMedia();
    hideSplash();
}

// Mostrar error
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorScreen.classList.remove('hidden');
    hideAllMedia();
    hideSplash();
}

// Ocultar error
function hideError() {
    elements.errorScreen.classList.add('hidden');
}

// Actualizar estado de conexión
function updateConnectionStatus(connected) {
    AppState.isConnected = connected;
    
    if (connected) {
        elements.status.classList.remove('offline');
        elements.status.classList.add('online');
        elements.statusText.textContent = 'En línea';
    } else {
        elements.status.classList.remove('online');
        elements.status.classList.add('offline');
        elements.statusText.textContent = 'Desconectado';
    }
}

// Iniciar sincronización periódica
function startSync() {
    // Sincronizar inmediatamente
    fetchPlayback();
    
    // Sincronizar periódicamente con intervalo normal
    AppState.syncInterval = setInterval(() => {
        if (AppState.isConnected) {
            fetchPlayback();
        }
    }, CONFIG.SYNC_INTERVAL);
    
    // Sincronización más frecuente cerca de los minutos (0, 15, 30, 45)
    // para detectar programaciones más rápido
    AppState.minuteCheckInterval = setInterval(() => {
        const now = new Date();
        const seconds = now.getSeconds();
        // En los primeros 10 segundos de cada minuto, sincronizar más frecuentemente
        if (seconds < 10 && AppState.isConnected) {
            fetchPlayback();
        }
    }, 5000); // Cada 5 segundos
}

// Iniciar verificación de conexión
function startConnectionCheck() {
    AppState.connectionCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${CONFIG.SERVER_URL}/health`);
            if (response.ok) {
                updateConnectionStatus(true);
            } else {
                updateConnectionStatus(false);
            }
        } catch (error) {
            updateConnectionStatus(false);
        }
    }, CONFIG.CONNECTION_CHECK_INTERVAL);
}

// Configurar event listeners
function setupEventListeners() {
    // Botón de reintentar
    elements.retryBtn.addEventListener('click', () => {
        hideError();
        registerDevice();
        fetchPlayback();
    });
    
    // Manejar visibilidad de la página
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && AppState.isConnected) {
            fetchPlayback();
        }
    });
    
    // Manejar cuando la página vuelve a estar activa
    window.addEventListener('focus', () => {
        if (AppState.isConnected) {
            fetchPlayback();
        }
    });
}

// Función global para activar audio (llamada desde el botón)
function unmuteVideo() {
    if (elements.videoPlayer) {
        console.log('🔊 Activando audio manualmente desde botón');
        
        // Forzar activación de audio de múltiples formas
        elements.videoPlayer.muted = false;
        elements.videoPlayer.removeAttribute('muted');
        elements.videoPlayer.volume = 1.0;
        
        // Intentar reproducir de nuevo para activar audio
        elements.videoPlayer.play().then(() => {
            console.log('✅ Video reproducido después de activar audio');
        }).catch(err => {
            console.error('❌ Error al reproducir después de activar audio:', err);
        });
        
        // Ocultar botón inmediatamente después de hacer clic
        const unmuteBtn = document.getElementById('audio-unmute-btn');
        if (unmuteBtn) {
            // Ocultar con animación suave
            unmuteBtn.style.opacity = '0';
            setTimeout(() => {
                unmuteBtn.classList.add('hidden');
                console.log('✅ Botón ocultado después de activar audio');
            }, 300);
        }
        
        // Verificar estado después de un momento
        setTimeout(() => {
            console.log('📊 Estado de audio después de activar:', {
                muted: elements.videoPlayer.muted,
                volume: elements.videoPlayer.volume,
                paused: elements.videoPlayer.paused,
                hasMutedAttr: elements.videoPlayer.hasAttribute('muted')
            });
        }, 500);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
