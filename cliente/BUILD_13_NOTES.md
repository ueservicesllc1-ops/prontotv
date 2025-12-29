# Build 13 - Auto-Start Feature

## Fecha: 2025-12-21

## Nuevas Características

### 🚀 Auto-Start al Encender TV (PRINCIPAL)
- La aplicación se inicia automáticamente cuando se enciende el TV
- BroadcastReceiver escucha eventos `BOOT_COMPLETED` y `QUICKBOOT_POWERON`
- Delay de 3 segundos para asegurar que servicios de red estén listos
- Compatible con Android TV 5.0+

### Archivos Nuevos:
- `android/app/src/main/java/com/prontotv/client/BootReceiver.java`

### Archivos Modificados:
- `android/app/src/main/AndroidManifest.xml`
  - Agregado permiso `RECEIVE_BOOT_COMPLETED`
  - Registrado `BootReceiver` con prioridad 999

## Características Previas Incluidas

### Build 12:
- ✅ Audio habilitado en reproducción
- ✅ Playback optimizado en WebView

### Build 11:
- ✅ Play Now instantáneo
- ✅ Sync cada 2 minutos (optimizado Firestore)

## Cómo Compilar Este Build

```powershell
# 1. Sincronizar cambios con Capacitor
cd cliente
npx cap sync

# 2. Compilar APK
.\build-apk.ps1

# 3. El APK estará en: ProntoTV-Client.apk
```

## Cómo Probar el Auto-Start

1. Instalar APK en el TV
2. Abrir la app manualmente una vez
3. Apagar completamente el TV (desconectar cable)
4. Encender el TV de nuevo
5. Esperar 10-15 segundos
6. La app debería abrirse automáticamente ✅

## Solución de Problemas

### La app no inicia automáticamente:
- Verificar permisos de autostart en Configuración > Apps > ProntoTV
- Asegurar que el TV se apaga completamente (no solo suspender)
- En algunos TVs (Xiaomi, Samsung): habilitar "Autostart" manualmente en configuración de la app

## Release Notes para Usuarios

```
ProntoTV Build 13 - Auto-Start Edition

✨ Nuevas Funcionalidades:
• Auto-start: La app se inicia automáticamente cuando enciendes el TV
• Ideal para instalaciones desatendidas (tiendas, restaurantes, etc.)

🔧 Optimizaciones:
• Sincronización cada 2 minutos (reduce uso de datos)
• Caché mejorado para menor latencia
• Mejor manejo de reinicio del dispositivo

📝 Instrucciones:
1. Instala la app
2. Ábrela una vez manualmente
3. Apaga y enciende el TV
4. La app se abrirá automáticamente

⚠️ Nota: En algunos TVs puede requerir habilitar 
"Auto-start" en la configuración de la app.
```

## Versión Sugerida

```json
{
  "version": "1.3.0",
  "buildNumber": 13,
  "buildDate": "2025-12-21",
  "releaseNotes": "Auto-start al encender TV 🚀"
}
```

---

## Checklist Pre-Build

- [x] BootReceiver.java creado
- [x] AndroidManifest.xml actualizado
- [x] Permiso RECEIVE_BOOT_COMPLETED agregado
- [x] Documentación AUTO_START.md creada
- [ ] npx cap sync ejecutado
- [ ] APK compilado
- [ ] APK probado en TV real
- [ ] version.json actualizado

## Próximas Mejoras Sugeridas

- [ ] Configurar como Launcher predeterminado (opcional)
- [ ] Agregar configuración de delay ajustable
- [ ] Implementar keep-alive para prevenir que el sistema mate la app
- [ ] Agregar opción para deshabilitar screensaver del TV
