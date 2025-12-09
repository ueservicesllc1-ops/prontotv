# Guía Rápida - ProntoTV

## Inicio Rápido (5 minutos)

### 1. Configurar Firebase

1. Crea el archivo `server/.env`:
   ```
   PORT=3000
   FIREBASE_PROJECT_ID=prontotv-f3c3b
   ```

2. Configura las reglas de Firestore (ver `FIREBASE_SETUP.md`)

### 2. Instalar y Ejecutar

```bash
# Instalar dependencias
npm install
cd admin && npm install && cd ..

# Iniciar servidor y admin
npm run dev
```

Abre http://localhost:5173 en tu navegador.

### 2. Agregar un Video

**Opción A: Subir directamente a B2**
1. Ve a la pestaña **Videos**
2. Click en **+ Agregar Video**
3. Selecciona **"Subir a B2"**
4. Selecciona un archivo de video desde tu computadora
5. Completa el nombre y duración
6. Click en **Subir y Agregar**

**Opción B: Usar URL existente**
1. Selecciona **"Usar URL"**
2. Pega la URL del video (ej: `https://s3.us-east-005.backblazeb2.com/mixercur/video.mp4`)
3. Completa el nombre y duración
4. Click en **Agregar**

### 3. Probar el Cliente

1. Abre `cliente/index.html` en un navegador
2. O mejor, edita `cliente/config.js` y cambia `SERVER_URL` a `http://localhost:3000/api`
3. Abre `cliente/index.html` en el navegador

El cliente se registrará automáticamente y buscará videos programados.

### 4. Programar un Video

1. En el admin, ve a **Programación**
2. Click en **+ Nueva Programación**
3. Selecciona:
   - **TV**: La TV que se registró automáticamente
   - **Video**: El video que creaste
   - **Hora Inicio**: Hora actual o próxima
   - **Hora Fin**: (opcional)
   - **Día**: (opcional, dejar vacío para todos los días)

4. El cliente debería comenzar a reproducir el video automáticamente

### 5. Reproducir Video Manualmente

1. Ve a la pestaña **TVs**
2. Click en **Reproducir Video** en la TV que quieres controlar
3. Selecciona el video
4. Click en **Reproducir**

El video comenzará inmediatamente en el cliente.

## Empaquetar como APK

### Usando Cordova (Más Fácil)

```bash
# Instalar Cordova
npm install -g cordova

# Crear proyecto
cordova create prontotv-apk com.prontotv.client ProntoTV
cd prontotv-apk

# Agregar Android
cordova platform add android

# Copiar archivos
cp -r ../cliente/* www/
cp ../cliente/config.xml config.xml

# IMPORTANTE: Editar www/config.js y cambiar SERVER_URL a tu servidor

# Build
cordova build android

# APK en: platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuración para Producción

### 1. Cambiar URL del Servidor

En `cliente/config.js`:
```javascript
SERVER_URL: 'https://tu-servidor.com/api'
```

### 2. Build del Admin

```bash
cd admin
npm run build
cd ..
```

### 3. Iniciar Servidor

```bash
npm start
```

O con PM2:
```bash
pm2 start server/index.js --name prontotv
```

## URLs de Video Soportadas

- ✅ **Backblaze B2** (Recomendado)
  - Formato: `https://f000.backblazeb2.com/file/[bucket]/[archivo]`
  - Ejemplo: `https://f000.backblazeb2.com/file/prontotv-videos/promo.mp4`
- ✅ Bunny CDN
- ✅ Cualquier URL de video directa (MP4, WebM, etc.)
- ✅ Servidores de video propios

**Nota**: Para Backblaze B2, asegúrate de configurar CORS en tu bucket (ver `FIREBASE_SETUP.md`).

## Características Principales

- ✅ **Registro Automático**: Los TVs se registran automáticamente al conectarse
- ✅ **Sincronización**: El cliente se sincroniza cada 30 segundos
- ✅ **Programación**: Programa videos por horario y día de la semana
- ✅ **Reproducción Manual**: Reproduce videos inmediatamente desde el admin
- ✅ **Estado en Tiempo Real**: Ve qué TVs están en línea

## Próximos Pasos

1. **Personalizar**: Edita los estilos en `cliente/styles.css` y `admin/src/App.css`
2. **Agregar Autenticación**: Protege el admin con login
3. **Notificaciones**: Agrega notificaciones push para eventos
4. **Analytics**: Agrega tracking de reproducciones

