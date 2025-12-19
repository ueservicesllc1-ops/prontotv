// Sistema de Auto-Actualización de APK
// Este módulo verifica si hay actualizaciones disponibles y permite actualizar la app

const AppUpdater = {
    currentVersion: '1.0.0',
    currentBuildNumber: 1,
    updateCheckInterval: null,
    isChecking: false,

    // URL del archivo de versión en el servidor
    versionUrl: 'https://drive.google.com/uc?export=download&id=1-joJv2LvPmZ97ltgRIxPGd7bXFYRNPMN',

    // Inicializar el sistema de actualización
    init() {
        console.log('🔄 Inicializando sistema de actualización...');

        // Solo funciona en Android/Capacitor
        if (!window.Capacitor || !window.Capacitor.getPlatform || window.Capacitor.getPlatform() !== 'android') {
            console.log('⚠️ Sistema de actualización solo disponible en Android');
            return;
        }

        // Cargar versión actual desde el archivo local
        this.loadCurrentVersion();

        // Verificar actualizaciones al iniciar (después de 10 segundos)
        setTimeout(() => {
            this.checkForUpdates();
        }, 10000);

        // Verificar actualizaciones cada 6 horas
        this.updateCheckInterval = setInterval(() => {
            this.checkForUpdates();
        }, 6 * 60 * 60 * 1000); // 6 horas
    },

    // Cargar versión actual desde archivo local
    async loadCurrentVersion() {
        try {
            const response = await fetch('./version.json');
            if (response.ok) {
                const versionData = await response.json();
                this.currentVersion = versionData.version;
                this.currentBuildNumber = versionData.buildNumber;
                console.log(`📱 Versión actual: ${this.currentVersion} (Build ${this.currentBuildNumber})`);
            }
        } catch (error) {
            console.error('❌ Error cargando versión actual:', error);
        }
    },

    // Verificar si hay actualizaciones disponibles
    async checkForUpdates(showNoUpdateMessage = false) {
        if (this.isChecking) {
            console.log('⏳ Ya hay una verificación en curso...');
            return;
        }

        this.isChecking = true;
        console.log('🔍 Verificando actualizaciones...');

        try {
            // Intentar obtener información de versión desde Google Drive
            // Nota: Google Drive no permite obtener metadata directamente sin autenticación
            // Por lo tanto, usaremos un archivo version.json en el servidor
            const serverVersionUrl = `${CONFIG.SERVER_URL}/client/version`;

            const response = await fetch(serverVersionUrl, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error('No se pudo obtener información de versión');
            }

            const serverVersion = await response.json();
            console.log('📦 Versión del servidor:', serverVersion);
            console.log('📱 Versión actual:', {
                version: this.currentVersion,
                buildNumber: this.currentBuildNumber
            });

            // Comparar versiones
            if (serverVersion.buildNumber > this.currentBuildNumber) {
                console.log('🆕 Nueva versión disponible!');
                this.showUpdateDialog(serverVersion);
            } else {
                console.log('✅ La aplicación está actualizada');
                if (showNoUpdateMessage) {
                    this.showNoUpdateMessage();
                }
            }
        } catch (error) {
            console.error('❌ Error verificando actualizaciones:', error);
        } finally {
            this.isChecking = false;
        }
    },

    // Mostrar diálogo de actualización
    showUpdateDialog(newVersion) {
        // Crear modal de actualización
        const modal = document.createElement('div');
        modal.id = 'update-modal';
        modal.className = 'update-modal';
        modal.innerHTML = `
            <div class="update-modal-content">
                <div class="update-icon">🔄</div>
                <h2>Actualización Disponible</h2>
                <p class="update-version">
                    Versión ${newVersion.version} (Build ${newVersion.buildNumber})
                </p>
                <p class="update-notes">${newVersion.releaseNotes || 'Nueva versión disponible'}</p>
                <div class="update-buttons">
                    <button id="update-now-btn" class="btn-update">
                        Actualizar Ahora
                    </button>
                    <button id="update-later-btn" class="btn-cancel">
                        Más Tarde
                    </button>
                </div>
                <div id="update-progress" class="update-progress hidden">
                    <div class="progress-bar">
                        <div id="progress-fill" class="progress-fill"></div>
                    </div>
                    <p id="progress-text">Descargando actualización...</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('update-now-btn').addEventListener('click', () => {
            this.downloadAndInstallUpdate(newVersion);
        });

        document.getElementById('update-later-btn').addEventListener('click', () => {
            this.closeUpdateDialog();
        });

        // Mostrar modal con animación
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    },

    // Mostrar mensaje de que no hay actualizaciones
    showNoUpdateMessage() {
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">✅</span>
                <span class="toast-message">La aplicación está actualizada</span>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    },

    // Descargar e instalar actualización
    async downloadAndInstallUpdate(newVersion) {
        console.log('📥 Descargando actualización...');

        const updateBtn = document.getElementById('update-now-btn');
        const laterBtn = document.getElementById('update-later-btn');
        const progressDiv = document.getElementById('update-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        // Ocultar botones y mostrar progreso
        updateBtn.style.display = 'none';
        laterBtn.style.display = 'none';
        progressDiv.classList.remove('hidden');

        try {
            progressText.textContent = 'Redirigiendo a la descarga...';
            progressFill.style.width = '50%';

            // Abrir el enlace de descarga en una nueva ventana
            // Esto permitirá al usuario descargar e instalar el APK
            const downloadUrl = newVersion.downloadUrl;

            console.log('📥 Abriendo enlace de descarga:', downloadUrl);

            // Intentar abrir en la misma ventana para forzar la descarga
            window.location.href = downloadUrl;

            progressFill.style.width = '100%';
            progressText.textContent = 'Descarga iniciada. Por favor, instala el APK cuando termine.';
            progressText.style.color = '#10b981';

            // Cerrar el modal después de 5 segundos
            setTimeout(() => {
                this.closeUpdateDialog();
            }, 5000);

        } catch (error) {
            console.error('❌ Error descargando actualización:', error);
            progressText.textContent = 'Error al descargar. Por favor, intenta más tarde.';
            progressText.style.color = '#ef4444';

            setTimeout(() => {
                this.closeUpdateDialog();
            }, 3000);
        }
    },

    // Cerrar diálogo de actualización
    closeUpdateDialog() {
        const modal = document.getElementById('update-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    },

    // Verificar actualizaciones manualmente (llamado desde UI)
    checkManually() {
        this.checkForUpdates(true);
    }
};

// Estilos para el modal de actualización
const updateStyles = document.createElement('style');
updateStyles.textContent = `
    .update-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .update-modal.show {
        opacity: 1;
    }
    
    .update-modal-content {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .update-modal.show .update-modal-content {
        transform: scale(1);
    }
    
    .update-icon {
        font-size: 80px;
        margin-bottom: 20px;
        animation: rotate 2s linear infinite;
    }
    
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .update-modal h2 {
        color: white;
        font-size: 28px;
        margin-bottom: 15px;
        font-weight: 700;
    }
    
    .update-version {
        color: rgba(255, 255, 255, 0.9);
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
    }
    
    .update-notes {
        color: rgba(255, 255, 255, 0.8);
        font-size: 16px;
        margin-bottom: 30px;
        line-height: 1.5;
    }
    
    .update-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
    }
    
    .btn-update, .btn-cancel {
        padding: 15px 30px;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-update {
        background: white;
        color: #667eea;
    }
    
    .btn-update:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(255, 255, 255, 0.3);
    }
    
    .btn-cancel {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }
    
    .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .update-progress {
        margin-top: 30px;
    }
    
    .progress-bar {
        width: 100%;
        height: 10px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        overflow: hidden;
        margin-bottom: 15px;
    }
    
    .progress-fill {
        height: 100%;
        background: white;
        border-radius: 5px;
        transition: width 0.3s ease;
        width: 0%;
    }
    
    #progress-text {
        color: white;
        font-size: 16px;
        font-weight: 500;
    }
    
    .update-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
    }
    
    .update-toast.show {
        opacity: 1;
        transform: translateX(0);
    }
    
    .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .toast-icon {
        font-size: 24px;
    }
    
    .toast-message {
        font-size: 16px;
        font-weight: 500;
    }
    
    .hidden {
        display: none !important;
    }
`;

document.head.appendChild(updateStyles);

// Exportar para uso global
window.AppUpdater = AppUpdater;
