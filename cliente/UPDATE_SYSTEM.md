# Sistema de Auto-Actualización de APK

Este documento explica cómo funciona el sistema de auto-actualización del APK de ProntoTV Cliente.

## 📋 Resumen

El sistema permite que las aplicaciones instaladas verifiquen automáticamente si hay nuevas versiones disponibles y se actualicen sin intervención manual del usuario.

## 🔄 Flujo de Actualización

1. **Verificación Automática**: La app verifica actualizaciones cada 6 horas
2. **Comparación de Versiones**: Se compara el `buildNumber` local con el del servidor
3. **Notificación al Usuario**: Si hay una nueva versión, se muestra un modal
4. **Descarga e Instalación**: El usuario puede actualizar con un clic

## 📁 Archivos Involucrados

### Cliente (`/cliente/www/`)
- `version.json` - Información de la versión actual
- `updater.js` - Lógica del sistema de actualización
- `index.html` - Incluye el script updater.js
- `app.js` - Inicializa el sistema de actualización

### Servidor (`/server/`)
- `index.js` - Endpoint `/api/client/version` que sirve la información de versión

### Build
- `build-apk.ps1` - Script que auto-incrementa la versión en cada build

## 🚀 Proceso de Actualización

### 1. Generar Nueva Versión

```powershell
cd e:\prontotv\cliente
.\build-apk.ps1
```

El script automáticamente:
- Incrementa el `buildNumber` en `version.json`
- Actualiza la fecha de build
- Compila el APK
- Copia el APK a la raíz del proyecto

### 2. Subir APK a Google Drive

1. Abre Google Drive
2. Navega a la carpeta donde está el APK
3. **Reemplaza** el archivo existente con el nuevo `ProntoTV-Client.apk`
   - **IMPORTANTE**: No borres y subas un archivo nuevo
   - Usa "Reemplazar archivo" para mantener el mismo ID de archivo
4. El ID del archivo debe seguir siendo: `1-joJv2LvPmZ97ltgRIxPGd7bXFYRNPMN`

### 3. Actualización Automática

Las aplicaciones instaladas:
- Verificarán automáticamente cada 6 horas
- Compararán su `buildNumber` con el del servidor
- Mostrarán un modal si hay una versión nueva
- Permitirán al usuario actualizar con un clic

## 🔧 Configuración

### Cambiar URL de Descarga

Si necesitas cambiar el enlace de Google Drive:

1. Edita `e:\prontotv\cliente\www\version.json`:
```json
{
  "version": "1.0.0",
  "buildNumber": 2,
  "buildDate": "2025-12-19T11:10:29-05:00",
  "downloadUrl": "https://drive.google.com/uc?export=download&id=TU_NUEVO_ID",
  "releaseNotes": "Descripción de los cambios"
}
```

2. Edita `e:\prontotv\cliente\build-apk.ps1` para actualizar el URL por defecto

### Cambiar Frecuencia de Verificación

Edita `e:\prontotv\cliente\www\updater.js`:

```javascript
// Cambiar de 6 horas a otro intervalo
this.updateCheckInterval = setInterval(() => {
    this.checkForUpdates();
}, 6 * 60 * 60 * 1000); // Cambiar este valor
```

### Notas de Versión

Edita `version.json` antes de compilar para agregar notas de versión:

```json
{
  "releaseNotes": "- Nueva funcionalidad X\n- Corrección de bug Y\n- Mejora de rendimiento Z"
}
```

## 📱 Plugins de Capacitor Necesarios

Para que la descarga e instalación funcionen completamente, necesitas estos plugins:

### 1. Capacitor HTTP

```bash
npm install @capacitor/http
npx cap sync
```

### 2. Capacitor Filesystem

```bash
npm install @capacitor/filesystem
npx cap sync
```

### 3. Plugin de Instalación de APK (Opcional)

Para instalación automática sin abrir el gestor de archivos:

```bash
npm install capacitor-plugin-app-update
npx cap sync
```

## 🔍 Verificación Manual

Los usuarios pueden verificar actualizaciones manualmente llamando:

```javascript
AppUpdater.checkManually();
```

Esto se puede agregar a un botón en la interfaz si lo deseas.

## 🐛 Solución de Problemas

### La app no detecta actualizaciones

1. Verifica que el servidor esté corriendo
2. Verifica que `/api/client/version` devuelva la versión correcta
3. Revisa la consola del navegador/logcat para errores

### Error al descargar el APK

1. Verifica que el enlace de Google Drive sea correcto
2. Asegúrate de que el archivo sea público o compartido
3. Usa el formato: `https://drive.google.com/uc?export=download&id=FILE_ID`

### El APK no se instala

1. Verifica que "Orígenes desconocidos" esté habilitado
2. Verifica que los plugins de Capacitor estén instalados
3. Revisa los permisos de la aplicación en AndroidManifest.xml

## 📊 Estructura de version.json

```json
{
  "version": "1.0.0",           // Versión semántica (manual)
  "buildNumber": 5,             // Número de build (auto-incrementado)
  "buildDate": "2025-12-19...", // Fecha de compilación (automática)
  "downloadUrl": "https://...", // URL de descarga del APK
  "releaseNotes": "..."         // Notas de la versión
}
```

## 🎯 Mejores Prácticas

1. **Siempre usa el script `build-apk.ps1`** para compilar
2. **Nunca edites manualmente el buildNumber** (se auto-incrementa)
3. **Actualiza releaseNotes** antes de cada build
4. **Prueba el APK** antes de subirlo a Google Drive
5. **Mantén el mismo ID de archivo** en Google Drive

## 🔐 Seguridad

- El sistema solo descarga desde la URL configurada
- Se verifica que el buildNumber sea mayor antes de actualizar
- El usuario siempre debe aprobar la actualización
- No se instalan actualizaciones automáticamente sin consentimiento

## 📝 Changelog

Mantén un registro de cambios en cada versión editando `releaseNotes` en `version.json`.

Ejemplo:
```json
{
  "releaseNotes": "v1.0.1 - Build 2\n• Agregado sistema de auto-actualización\n• Mejoras de rendimiento\n• Corrección de bugs menores"
}
```
