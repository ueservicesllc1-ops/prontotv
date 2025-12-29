# 🚀 Auto-Start en Android TV

## Descripción

La aplicación ProntoTV ahora se inicia **automáticamente** cuando se enciende el TV Android. Esta funcionalidad es ideal para instalaciones en tiendas, restaurantes, o cualquier lugar donde el TV debe mostrar contenido inmediatamente después de encenderse.

## ¿Cómo Funciona?

### 1. **BroadcastReceiver** (`BootReceiver.java`)
- Escucha el evento `BOOT_COMPLETED` del sistema Android
- Se activa cuando el TV termina de arrancar
- Espera 3 segundos antes de lanzar la app (para asegurar que la red esté lista)
- Inicia automáticamente `MainActivity`

### 2. **Permisos en AndroidManifest.xml**
```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### 3. **Receiver Registrado**
```xml
<receiver
    android:name=".BootReceiver"
    android:enabled="true"
    android:exported="true">
    <intent-filter android:priority="999">
        <action android:name="android.intent.action.BOOT_COMPLETED" />
        <action android:name="android.intent.action.QUICKBOOT_POWERON" />
    </intent-filter>
</receiver>
```

## Instalación

### Paso 1: Sincronizar Cambios con Android Studio
```bash
cd cliente
npx cap sync
```

### Paso 2: Compilar Nueva APK
```bash
# Opción 1: Usando el script PowerShell
.\build-apk.ps1

# Opción 2: Manual desde Android Studio
npx cap open android
# Luego: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### Paso 3: Instalar en el TV
1. Copiar el APK al TV (USB, ADB, Google Drive, etc.)
2. Instalar el APK
3. **Importante**: Dale permisos de "Autostart" si el sistema lo solicita

## Verificación

### Probar el Auto-Start:
1. Instala la nueva APK en el TV
2. Abre la app manualmente una vez (para asegurar que todo está configurado)
3. **Apaga completamente el TV** (no solo suspender)
4. **Enciende el TV**
5. Espera ~10-15 segundos
6. La app ProntoTV debería abrirse automáticamente ✅

### Logs (para debugging):
Si conectas el TV via ADB, puedes ver los logs:
```bash
adb logcat | grep "ProntoTV-BootReceiver"
```

Deberías ver:
```
📱 Boot event received: android.intent.action.BOOT_COMPLETED
🚀 Iniciando ProntoTV automáticamente...
✅ ProntoTV iniciado exitosamente
```

## Consideraciones Importantes

### 1. **Permisos en Algunos TVs**
Algunos fabricantes (Samsung, Xiaomi, etc.) tienen configuraciones adicionales de seguridad que requieren permitir explícitamente el "autostart":

- **Xiaomi/Mi TV**: Ajustes > Apps > Permisos > Autostart > ProntoTV ✅
- **Samsung**: Ajustes > Aplicaciones > ProntoTV > Permisos > Inicio automático ✅
- **Sony/Android TV estándar**: Normalmente no requiere configuración adicional

### 2. **Delay de 3 Segundos**
El código incluye un delay de 3 segundos antes de iniciar la app. Esto es para:
- ✅ Asegurar que los servicios de red estén activos
- ✅ Evitar conflictos con el arranque del sistema
- ✅ Dar tiempo para que Firestore/API esté disponible

Si necesitas ajustar este delay:
```java
// En BootReceiver.java, línea ~40
}, 3000); // Cambia este valor (en milisegundos)
```

### 3. **Compatibilidad**
- ✅ Android TV 5.0+ (Lollipop)
- ✅ Android 6.0+ (Marshmallow) - Recomendado
- ✅ Funciona en modo TV y en tablets/teléfonos Android normales

### 4. **Múltiples Launchers**
Si el TV tiene múltiples apps configuradas para auto-start, solo la que tenga mayor prioridad se iniciará. ProntoTV usa prioridad `999` (alta, pero no máxima).

## Solución de Problemas

### ❌ La app no se inicia automáticamente

**Causa 1**: Permisos no otorgados
- **Solución**: Ve a Configuración > Apps > ProntoTV > Permisos y asegúrate de que "Autostart" esté habilitado

**Causa 2**: El TV está en modo "suspender" en vez de "apagado"
- **Solución**: Apaga completamente el TV (desconecta y reconecta el cable de poder si es necesario)

**Causa 3**: Battery optimization bloquea el autostart
- **Solución**: 
  1. Ajustes > Apps > ProntoTV
  2. Batería/Optimización de batería
  3. Seleccionar "No optimizar"

**Causa 4**: Conflicto con otra app launcher
- **Solución**: Verifica si otra app está configurada como launcher predeterminado

### 🔍 Debugging
```bash
# Conectar vía ADB
adb connect [IP_DEL_TV]:5555

# Ver logs en tiempo real
adb logcat -s ProntoTV-BootReceiver

# Simular evento de boot (requiere root)
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED
```

## Alternativa: Establecer como Launcher Predeterminado

Si quieres que ProntoTV sea el **launcher predeterminado** del TV (reemplazando el home screen), puedes configurarlo:

### En el TV:
1. Ajustes > Apps > Apps predeterminadas
2. App de inicio
3. Seleccionar **ProntoTV**

Esto hará que ProntoTV se abra cada vez que presiones el botón HOME del control remoto.

## Próximos Builds

Para los próximos builds del APK, asegúrate de:
1. ✅ Sincronizar: `npx cap sync`
2. ✅ Compilar con el script: `.\build-apk.ps1`
3. ✅ Incrementar version en `www/version.json`

---

## Archivos Modificados

- ✅ `android/app/src/main/java/com/prontotv/client/BootReceiver.java` (nuevo)
- ✅ `android/app/src/main/AndroidManifest.xml` (actualizado)

## Build Number

Sugerencia: Crear **Build 13** con esta funcionalidad:
- Auto-start al encender TV ✨
- Todas las optimizaciones previas de Firestore
- Audio habilitado
- Sync cada 2 minutos

---

**Fecha**: 2025-12-21  
**Feature**: Auto-Start en Boot 🚀
