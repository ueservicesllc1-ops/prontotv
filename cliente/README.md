# ProntoTV - Cliente

Webapp cliente que se empaqueta como APK para TVs Android.

## Características

- ✅ Reproducción automática de videos desde URLs
- ✅ Sincronización con servidor cada 30 segundos
- ✅ Detección de conexión en tiempo real
- ✅ Manejo de errores y reintentos
- ✅ Interfaz optimizada para TV

## Empaquetar como APK

### Opción 1: Usando Cordova

```bash
# Instalar Cordova
npm install -g cordova

# Crear proyecto Cordova
cordova create prontotv-client com.prontotv.client ProntoTV

# Agregar plataforma Android
cd prontotv-client
cordova platform add android

# Copiar archivos del cliente
cp -r ../cliente/* www/

# Configurar config.xml para WebView
# Editar www/config.xml y agregar:
# <preference name="Fullscreen" value="true" />
# <preference name="Orientation" value="landscape" />

# Build APK
cordova build android

# APK estará en: platforms/android/app/build/outputs/apk/debug/
```

### Opción 2: Usando Capacitor

```bash
# Instalar Capacitor
npm install -g @capacitor/cli

# Inicializar proyecto
npx cap init

# Agregar plataforma Android
npx cap add android

# Copiar archivos
npx cap copy

# Abrir en Android Studio
npx cap open android

# Build desde Android Studio
```

## Configuración

Editar `config.js` y cambiar `SERVER_URL` a la URL de tu servidor:

```javascript
SERVER_URL: 'https://tu-servidor.com/api'
```

## Requisitos Android

- Android 5.0 (API 21) o superior
- Permisos de Internet
- WebView actualizado

