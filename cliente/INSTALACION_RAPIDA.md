# 📱 Guía Rápida de Instalación - Build 13

## APK Ubicación
```
e:\prontotv\cliente\ProntoTV-Client.apk
```

## ✨ Novedades Build 13
- ✅ **Auto-start al encender TV** 🚀
- ✅ Optimización Firestore (-99% cuota)
- ✅ Sync cada 2 minutos
- ✅ Audio funcionando
- ✅ Mejor estabilidad

---

## 🎯 Pasos de Instalación

### Opción 1: Instalación via ADB (Recomendado)

1. **Conectar a la red del TV**:
   ```bash
   adb connect [IP_DEL_TV]:5555
   # Ejemplo: adb connect 192.168.1.100:5555
   ```

2. **Instalar APK**:
   ```bash
   adb install -r e:\prontotv\cliente\ProntoTV-Client.apk
   ```

3. **Abrir app automáticamente**:
   ```bash
   adb shell am start -n com.prontotv.client/.MainActivity
   ```

### Opción 2: Instalación Manual

1. **Copiar APK al TV**:
   - USB
   - Google Drive
   - AirDroid

2. **En el TV**:
   - Abrir explorador de archivos
   - Localizar el APK
   - Instalar

3. **Abrir la app** al menos una vez manualmente

---

## ⚙️ Configuración Post-Instalación

### 1. Verificar Auto-Start (Solo primera vez)

**Si es Xiaomi/Mi TV**:
```
Configuración > Apps > Permisos > Autostart > ProntoTV ✅
```

**Si es Samsung**:
```
Configuración > Aplicaciones > ProntoTV > Inicio automático ✅
```

**Android TV Normal**: No requiere configuración adicional

### 2. Probar Auto-Start

1. Apagar completamente el TV (desconectar si es necesario)
2. Encender el TV
3. Esperar 10-15 segundos
4. La app debería abrirse automáticamente ✅

---

## 🔧 Comandos ADB Útiles

### Conectar al TV
```bash
# Encontrar IP del TV: Configuración > Red > Estado
adb connect 192.168.1.XXX:5555
```

### Instalar/Actualizar
```bash
# -r = replace (actualizar si ya existe)
adb install -r ProntoTV-Client.apk
```

### Abrir App
```bash
adb shell am start -n com.prontotv.client/.MainActivity
```

### Ver Logs en Tiempo Real
```bash
adb logcat | grep "ProntoTV"
```

### Desinstalar (si necesitas limpiar)
```bash
adb uninstall com.prontotv.client
```

### Simular Boot (para probar auto-start sin reiniciar)
```bash
# Requiere permisos especiales
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED
```

---

## 📋 Checklist de Instalación

Por cada TV:

- [ ] Conectar via ADB o preparar APK en USB
- [ ] Instalar APK
- [ ] Abrir app manualmente (primera vez)
- [ ] Verificar que se conecta al servidor
- [ ] Verificar que reproduce contenido
- [ ] Habilitar auto-start en configuración (si es necesario)
- [ ] Probar auto-start (apagar y encender TV)
- [ ] Anotar IP y device_id del TV

---

## 🆘 Solución de Problemas Rápida

### ❌ No se puede conectar via ADB
**Solución**: 
1. Habilitar "Depuración USB" en el TV
2. Habilitar "Depuración por red" (ADB over network)
3. Verificar que estén en la misma red WiFi

### ❌ App no inicia automáticamente
**Solución**:
1. Verificar permisos de auto-start
2. Apagar completamente el TV (no solo suspender)
3. En algunos TVs: Ir a Configuración > Batería > Optimización > ProntoTV > No optimizar

### ❌ App no se conecta al servidor
**Solución**:
1. Verificar que el TV tenga internet
2. Abrir navegador en el TV y ir a: https://prontotv-production.up.railway.app/api/health
3. Debería mostrar: `{"status":"ok",...}`

### ❌ No reproduce videos
**Solución**:
1. Verificar que hay schedules programados para ese TV
2. Desde admin: Asignar un video al TV
3. Verificar hora actual del TV (debe coincidir con schedule)

---

## 📊 Info del Build

- **Versión**: 1.3.0
- **Build**: 13
- **Fecha**: 2025-12-21
- **Tamaño**: 5.3 MB

## 🌐 URLs Importantes

- **Servidor API**: https://prontotv-production.up.railway.app/api
- **Health Check**: https://prontotv-production.up.railway.app/api/health
- **Admin Panel**: https://prontotv-production.up.railway.app

---

## 📝 Notas para Recordar

1. **Primera instalación**: Abrir app manualmente al menos una vez
2. **Auto-start**: Probar apagando y encendiendo TV completamente
3. **Permisos**: Algunos TVs requieren habilitar auto-start manualmente
4. **Server**: El servidor debe estar corriendo (Railway)
5. **Device ID**: Se genera automáticamente, puedes verlo en Admin Panel

---

## 🚀 Para Múltiples TVs

Si tienes que instalar en varios TVs, puedes automatizar:

```bash
# Lista de IPs de los TVs
$tvs = @("192.168.1.100", "192.168.1.101", "192.168.1.102")

foreach ($tv in $tvs) {
    Write-Host "📺 Instalando en TV: $tv"
    adb connect "$tv:5555"
    adb install -r ProntoTV-Client.apk
    adb shell am start -n com.prontotv.client/.MainActivity
    adb disconnect "$tv:5555"
    Write-Host "✅ Completado: $tv`n"
}
```

---

**¡Buena suerte con la instalación! 🎉**

Si algo no funciona, revisa los logs con:
```bash
adb logcat | grep "ProntoTV"
```
