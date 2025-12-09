# Guía de Instalación - ProntoTV

## Requisitos Previos

- Node.js 16+ y npm
- Para empaquetar APK: Android Studio o Cordova CLI

## Instalación Rápida

### 1. Instalar Dependencias

```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del admin
cd admin
npm install
cd ..
```

### 2. Configurar Variables de Entorno

El archivo `.env` ya está creado en `server/` con valores por defecto. Si necesitas cambiarlos:

```bash
cd server
# Editar .env si es necesario
PORT=3000
DB_PATH=./database.db
```

### 3. Iniciar el Servidor

```bash
# Desarrollo (servidor + admin)
npm run dev

# O por separado:
# Terminal 1 - Servidor
npm run dev:server

# Terminal 2 - Admin
npm run dev:admin
```

El sistema estará disponible en:
- **Backend API**: http://localhost:3000/api
- **Admin Panel**: http://localhost:5173 (desarrollo) o http://localhost:3000 (producción)

## Empaquetar Cliente como APK

### Opción 1: Usando Cordova (Recomendado)

```bash
# Instalar Cordova globalmente
npm install -g cordova

# Crear proyecto Cordova
cordova create prontotv-apk com.prontotv.client ProntoTV

# Entrar al proyecto
cd prontotv-apk

# Agregar plataforma Android
cordova platform add android

# Copiar archivos del cliente
cp -r ../cliente/* www/

# Copiar config.xml
cp ../cliente/config.xml config.xml

# Configurar permisos en config.xml (ya incluidos)

# Build APK
cordova build android

# APK de debug estará en:
# platforms/android/app/build/outputs/apk/debug/app-debug.apk

# Para APK de release (firmado):
cordova build android --release
```

### Opción 2: Usando Capacitor

```bash
# Instalar Capacitor CLI
npm install -g @capacitor/cli

# En la carpeta cliente
cd cliente

# Inicializar Capacitor (si no está inicializado)
npx cap init

# Agregar plataforma Android
npx cap add android

# Copiar archivos web
npx cap copy

# Abrir en Android Studio
npx cap open android

# En Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### Opción 3: Android Studio Directo

1. Crear nuevo proyecto Android en Android Studio
2. Configurar WebView
3. Copiar archivos de `cliente/` a `assets/`
4. Configurar MainActivity para cargar `index.html`
5. Build APK

## Configuración del Cliente

Antes de empaquetar, edita `cliente/config.js` y cambia la URL del servidor:

```javascript
SERVER_URL: 'https://tu-servidor.com/api'
```

## Producción

### Build del Admin

```bash
cd admin
npm run build
cd ..
```

El admin se servirá automáticamente desde el servidor en producción.

### Iniciar Servidor en Producción

```bash
npm start
```

O usando PM2:

```bash
npm install -g pm2
pm2 start server/index.js --name prontotv
```

## Base de Datos

La base de datos SQLite se crea automáticamente en `server/database.db` la primera vez que se ejecuta el servidor.

Para resetear la base de datos, simplemente elimina `server/database.db` y reinicia el servidor.

## Solución de Problemas

### El cliente no se conecta al servidor

1. Verifica que la URL en `cliente/config.js` sea correcta
2. Verifica que el servidor esté corriendo
3. Verifica permisos de Internet en el APK (AndroidManifest.xml)

### Videos no se reproducen

1. Verifica que las URLs de los videos sean accesibles
2. Verifica que los videos sean compatibles con HTML5 (MP4, WebM)
3. Verifica permisos de red en el APK

### El admin no carga

1. Verifica que el build del admin se haya completado: `cd admin && npm run build`
2. Verifica que el servidor esté sirviendo archivos estáticos correctamente

