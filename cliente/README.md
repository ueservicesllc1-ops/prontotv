# ProntoTV - Cliente Android

Aplicación cliente para Android TV que reproduce contenido de video sincronizado con el servidor ProntoTV.

## 📱 Características

- ✅ Reproducción automática de videos desde URLs
- ✅ Sincronización con servidor cada 2 minutos (optimizado para Firestore)
- ✅ Detección de conexión en tiempo real
- ✅ Manejo de errores y reintentos
- ✅ Interfaz optimizada para TV
- ✅ Soporte para Firebase
- ✅ Configuración dinámica del servidor
- ✅ **Auto-start al encender el TV** 🚀 (nuevo)

## 🚀 Generar APK

### Método Rápido (Recomendado)

Ejecuta el script de PowerShell incluido:

```powershell
.\build-apk.ps1
```

Este script automáticamente:
1. Copia los archivos web a la carpeta `www`
2. Sincroniza con Capacitor
3. Construye el APK usando Gradle
4. Copia el APK a la raíz del proyecto

### Método Manual

Si prefieres hacerlo paso a paso:

```bash
# 1. Copiar archivos a www
Copy-Item -Path index.html,app.js,config.js,firebase.js,styles.css,logo.png,videos.html -Destination www\ -Force

# 2. Sincronizar con Capacitor
npx cap sync android

# 3. Construir APK
cd android
.\gradlew.bat assembleDebug
cd ..

# 4. El APK estará en:
# android\app\build\outputs\apk\debug\app-debug.apk
```

## ⚙️ Configuración

### Configurar URL del Servidor

Edita `config.js` y cambia `SERVER_URL` a la URL de tu servidor:

```javascript
SERVER_URL: 'https://tu-servidor.com/api'
```

### Configurar Firebase

Edita `firebase.js` con tus credenciales de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  // ... resto de la configuración
};
```

## 📦 Instalación del APK

### En Android TV

1. Habilita "Orígenes desconocidos" en Configuración > Seguridad
2. Transfiere el APK a la TV (USB, red, etc.)
3. Usa un explorador de archivos para instalar el APK
4. Abre la aplicación ProntoTV

### En Dispositivo Android

```bash
# Usando ADB
adb install ProntoTV-Client.apk

# O transfiere el archivo y ábrelo en el dispositivo
```

## 🔧 Requisitos

### Para Desarrollo

- Node.js 16 o superior
- npm o yarn
- Java JDK 11 o superior
- Android SDK (se descarga automáticamente con Gradle)

### Para Ejecución

- Android 5.0 (API 21) o superior
- Permisos de Internet
- WebView actualizado

## 📂 Estructura del Proyecto

```
cliente/
├── www/                    # Archivos web empaquetados
│   ├── index.html
│   ├── app.js
│   ├── config.js
│   ├── firebase.js
│   └── styles.css
├── android/                # Proyecto Android nativo
│   └── app/
│       └── build/
│           └── outputs/
│               └── apk/
│                   └── debug/
│                       └── app-debug.apk
├── capacitor.config.json   # Configuración de Capacitor
├── package.json            # Dependencias del proyecto
├── build-apk.ps1          # Script de compilación
└── ProntoTV-Client.apk    # APK generado (después de compilar)
```

## 🐛 Solución de Problemas

### El APK no se instala

- Verifica que "Orígenes desconocidos" esté habilitado
- Asegúrate de que el dispositivo tenga Android 5.0 o superior

### La aplicación no se conecta al servidor

- Verifica que `SERVER_URL` en `config.js` sea correcto
- Asegúrate de que el dispositivo tenga conexión a Internet
- Verifica que el servidor esté accesible desde la red del dispositivo

### Error al compilar

- Asegúrate de tener Java JDK instalado
- Verifica que las dependencias estén instaladas: `npm install`
- Limpia el proyecto: `cd android && .\gradlew.bat clean`

## 📝 Notas

- El APK generado es una versión de **debug**, no firmada
- Para producción, genera un APK firmado usando Android Studio
- La primera compilación puede tardar varios minutos mientras descarga dependencias

## 🔄 Actualizar la Aplicación

Después de hacer cambios en el código:

```bash
# Opción 1: Usar el script
.\build-apk.ps1

# Opción 2: Solo sincronizar (si no cambiaste código nativo)
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

## 📄 Licencia

MIT
