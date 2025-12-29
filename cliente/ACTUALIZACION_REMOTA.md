# 🚀 Actualización Remota Automática - Guía Completa

## ✨ ¡Sí, puedes actualizar todos los TVs remotamente desde tu casa!

El sistema YA ESTÁ IMPLEMENTADO en ProntoTV. Solo necesitas configurar Google Drive.

---

## 📋 Cómo Funciona

1. **Compilar nuevo APK** (desde tu casa)
2. **Subir a Google Drive** (desde tu casa)
3. **Los TVs verifican automáticamente** cada 6 horas
4. **Se muestran un mensaje** de actualización disponible
5. **El usuario toca "Actualizar"** (o puedes hacer que sea completamente automático)
6. **El APK se descarga e instala** automáticamente

---

## 🎯 Configuración Inicial (Solo Una Vez)

### Paso 1: Crear Carpeta en Google Drive

1. **Ve a Google Drive**: https://drive.google.com
2. **Crea una carpeta** llamada `ProntoTV-APKs`
3. **Haz clic derecho** en la carpeta → **Compartir**
4. **Cambiar a**: "Cualquier persona con el enlace" → **Lector**
5. **Copiar el enlace**

### Paso 2: Subir el Build 13

1. **Sube** `e:\prontotv\cliente\ProntoTV-Client.apk` a la carpeta
2. **Haz clic derecho** en el archivo → **Obtener enlace**
3. **Copiar el ID del archivo**:
   - Enlace completo: `https://drive.google.com/file/d/1ABC123XYZ/view?usp=sharing`
   - ID del archivo: `1ABC123XYZ`
4. **Guardar este ID** para el siguiente paso

### Paso 3: Actualizar version.json

Edita `e:\prontotv\cliente\www\version.json`:

```json
{
    "version": "1.3.0",
    "buildNumber": 13,
    "buildDate": "2025-12-21T19:16:00-05:00",
    "downloadUrl": "https://drive.google.com/uc?export=download&id=TU_ID_AQUI",
    "releaseNotes": "v1.3.0 - Build 13 🚀\n• Auto-start al encender el TV\n• Optimización de cuota Firestore (-99%)\n• Mejor estabilidad y rendimiento"
}
```

**Reemplaza `TU_ID_AQUI`** con el ID que copiaste.

### Paso 4: Sincronizar y Compilar de Nuevo

```bash
cd cliente
npx cap sync
.\build-apk.ps1
```

### Paso 5: Instalar Build 13 en los TVs (Solo Esta Primera Vez)

Tienes que ir a la oficina **solo una vez** para instalar el Build 13 que tiene el sistema de actualización.

---

## 🔄 Flujo de Actualizaciones Futuras (100% Remoto)

### Desde tu casa:

1. **Hacer cambios** en el código
2. **Compilar nuevo APK**:
   ```bash
   cd e:\prontotv\cliente
   .\build-apk.ps1
   ```

3. **Subir a Google Drive**:
   - **IMPORTANTE**: **REEMPLAZAR** el archivo existente
   - No borres y subas uno nuevo (debe mantener el mismo ID)
   - Clic derecho → "Reemplazar archivo" → Seleccionar nuevo APK

4. **Actualizar version.json** en el servidor:
   - El build script ya actualiza automáticamente el buildNumber
   - Solo asegúrate de que esté sincronizado con el servidor

5. **Esperar** (o forzar actualización)

### En los TVs:

- **Automáticamente** cada 6 horas verifican si hay una nueva versión
- **Muestran un mensaje** bonito: "Actualización Disponible"
- **El usuario toca** "Actualizar Ahora"
- **Se descarga e instala** automáticamente

---

## ⚡ Hacer Actualización COMPLETAMENTE Automática (Sin Intervención)

Si quieres que los TVs se actualicen SOLOS sin que nadie toque nada, necesitas agregar un plugin:

```bash
cd cliente
npm install capacitor-plugin-app-update
npx cap sync
```

Luego modificar `updater.js` para instalar automáticamente. Déjame saber si quieres esto.

---

## 🎬 Demostración Paso a Paso

### Ejemplo: Actualizar a Build 14

**Desde tu casa (5 minutos)**:

```powershell
# 1. Hacer cambios en el código (si los hay)
# ...

# 2. Compilar Build 14
cd e:\prontotv\cliente
.\build-apk.ps1

# 3. El script automáticamente:
#    - Incrementa buildNumber a 14
#    - Actualiza la fecha
#    - Compila el APK
#    - Copia a e:\prontotv\cliente\ProntoTV-Client.apk
```

**En Google Drive (2 minutos)**:

1. Ve a la carpeta `ProntoTV-APKs`
2. Clic derecho en `ProntoTV-Client.apk`
3. "Reemplazar archivo..."
4. Selecciona el nuevo APK de `e:\prontotv\cliente\ProntoTV-Client.apk`
5. ¡Listo!

**En los TVs (automático)**:

- Máximo 6 horas: Los TVs verificarán automáticamente
- Se mostrará: "Actualización Disponible - Build 14"
- Usuario toca: "Actualizar Ahora"
- Se instala automáticamente
- ¡Hecho!

---

## 🚀 Forzar Actualización Inmediata (Sin Esperar 6 Horas)

### Opción 1: Reducir Intervalo de Verificación

Edita `www/updater.js` línea 32:

```javascript
// Cambiar de 6 horas a 30 minutos
this.updateCheckInterval = setInterval(() => {
    this.checkForUpdates();
}, 30 * 60 * 1000); // 30 minutos
```

### Opción 2: Verificación al Inicio

Ya está implementado (línea 27): Se verifica 10 segundos después de abrir la app.

### Opción 3: Servidor Push (Avanzado)

Puedes implementar un sistema donde el servidor "empuje" una notificación a los TVs:

```javascript
// En server/index.js - Agregar endpoint
app.post('/api/tvs/:id/force-update', async (req, res) => {
  // Enviar comando al TV via WebSocket
  io.to(tvId).emit('force-update-check');
  res.json({ success: true });
});
```

---

## 📊 Monitoreo de Actualizaciones

### Ver qué TVs se actualizaron:

En el Admin Panel (futuro feature), podrías agregar:

```javascript
// Mostrar versión de cada TV
TVs:
- TV Oficina Principal: Build 13 ✅
- TV Recepción: Build 12 ⚠️ (pendiente actualización)
- TV Sala de Espera: Build 13 ✅
```

---

## 🛠️ Script de Google Drive Upload Automático

Para hacerlo aún más fácil, puedes usar Google Drive API:

```powershell
# Instalar módulo de Google Drive
Install-Module -Name GoogleDrive

# Subir APK automáticamente
function Upload-ProntoTVAPK {
    $filePath = "e:\prontotv\cliente\ProntoTV-Client.apk"
    $fileId = "TU_ID_DE_GOOGLE_DRIVE"
    
    # Actualizar archivo en Google Drive
    Update-GoogleDriveFile -FileId $fileId -LocalPath $filePath
}
```

---

## ✅ Ventajas del Sistema de Actualización Remota

vs Ir a la Oficina:

| Característica | Actualización Remota | Ir a Oficina |
|----------------|---------------------|--------------|
| Tiempo | ⚡ 5 minutos | 🚗 1-2 horas |
| Costo | 💰 $0 | 💰 Gasolina + tiempo |
| Horario | 🌙 24/7 cualquier hora | 🏢 Horario laboral |
| Múltiples TVs | ✅ Todos a la vez | ❌ Uno por uno |
| Rollback | ✅ Inmediato | ❌ Requiere visita |

---

## 🔐 Seguridad

- ✅ Solo URLs configuradas en `version.json`
- ✅ Verificación de buildNumber (no instala versiones antiguas)
- ✅ Usuario debe aprobar (a menos que configures auto-install)
- ✅ APK debe estar firmado con la misma key

---

## 📝 Checklist de Configuración

Para Build 13 (primera vez):

- [ ] Crear carpeta en Google Drive
- [ ] Hacer carpeta pública (link)
- [ ] Subir Build 13 a Drive
- [ ] Copiar ID del archivo
- [ ] Actualizar `version.json` con el ID
- [ ] Recompilar Build 13 con version.json actualizado
- [ ] Ir a oficina e instalar Build 13 (solo esta vez)

Futuros builds (100% remoto):

- [ ] Compilar nuevo build
- [ ] Reemplazar APK en Google Drive
- [ ] ¡Listo! TVs se actualizan automáticamente

---

## 🆘 Solución de Problemas

### ❌ TVs no detectan actualización

**Causas**:
- Servidor no está corriendo
- `version.json` no se actualizó
- buildNumber en servidor no es mayor

**Solución**:
1. Verificar: https://prontotv-production.up.railway.app/api/client/version
2. Debe mostrar el nuevo buildNumber
3. Reiniciar servidor si es necesario

### ❌ Error al descargar APK

**Causas**:
- Google Drive ID incorrecto
- Archivo no es público
- Límite de descargas de Drive alcanzado

**Solución**:
1. Verificar que el link funciona en navegador
2. Formato correcto: `https://drive.google.com/uc?export=download&id=ID`
3. Archivo debe ser público (Anyone with the link)

---

## 💡 ¿Quieres que lo configure ahora?

Solo necesito que:

1. **Subas el Build 13 a Google Drive**
2. **Me des el ID del archivo**
3. **Yo actualizo el código y recompilo**

Luego solo tendrás que ir UNA VEZ a instalar el Build 13, y después **TODAS las futuras actualizaciones serán 100% remotas desde tu casa**. 🏠→📱

---

**¿Tienes el Google Drive listo? Dame el ID y lo configuro en 2 minutos** 🚀
