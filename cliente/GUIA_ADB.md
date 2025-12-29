# 📱 Guía Completa de ADB - Android Debug Bridge

## ¿Qué es ADB?

**ADB (Android Debug Bridge)** es una herramienta que te permite controlar dispositivos Android desde tu computadora a través de WiFi o USB.

### Con ADB puedes:
- ✅ Instalar apps remotamente (sin USB ni explorador de archivos)
- ✅ Abrir apps remotamente
- ✅ Ver logs en tiempo real
- ✅ Ejecutar comandos en el Android
- ✅ Copiar archivos
- ✅ Todo desde tu PC, sin tocar el TV

---

## 🚀 Instalación de ADB en tu PC

### Opción 1: Instalación Simple (Recomendado)

1. **Descargar Platform Tools**:
   - Ve a: https://developer.android.com/tools/releases/platform-tools
   - Descarga "SDK Platform-Tools for Windows"
   - Es un archivo ZIP (~15 MB)

2. **Extraer**:
   ```powershell
   # Ejemplo: extraer a C:\adb
   Expand-Archive -Path "Downloads\platform-tools-latest-windows.zip" -DestinationPath "C:\adb"
   ```

3. **Agregar al PATH** (para usar desde cualquier lugar):
   ```powershell
   # Ejecutar PowerShell como Administrador
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\adb\platform-tools", "Machine")
   ```

4. **Verificar instalación**:
   ```powershell
   # Cerrar y abrir nueva terminal PowerShell
   adb version
   # Debería mostrar: Android Debug Bridge version X.X.X
   ```

### Opción 2: Instalación Rápida con Chocolatey

Si tienes Chocolatey instalado:
```powershell
choco install adb
```

---

## 📺 Configurar el TV para ADB

### Paso 1: Habilitar Opciones de Desarrollador

1. **En el TV Android**, ve a:
   ```
   Configuración > Acerca de (o "About" o "Sistema")
   ```

2. **Busca "Número de compilación" o "Build number"**

3. **Toca 7 veces** sobre "Número de compilación"
   - Aparecerá un mensaje: "Ahora eres un desarrollador"

### Paso 2: Habilitar ADB

1. **Ve a**:
   ```
   Configuración > Opciones de desarrollador (o "Developer options")
   ```

2. **Habilita**:
   - ✅ "Opciones de desarrollador" (activar el switch principal)
   - ✅ "Depuración USB" o "USB debugging"
   - ✅ "Depuración por red" o "Network debugging" o "ADB over network"

### Paso 3: Obtener la IP del TV

1. **Ve a**:
   ```
   Configuración > Red > Estado de red
   ```
   O:
   ```
   Configuración > Conexiones > Wi-Fi > Red actual > Detalles
   ```

2. **Anota la dirección IP**
   - Ejemplo: `192.168.1.100`

---

## 🔌 Conectar a un TV

### Conectar via WiFi

1. **Asegúrate** de que tu PC y el TV están en la **misma red WiFi**

2. **Conectar**:
   ```bash
   adb connect 192.168.1.100:5555
   # Reemplaza 192.168.1.100 con la IP de tu TV
   ```

3. **Deberías ver**:
   ```
   connected to 192.168.1.100:5555
   ```

4. **En el TV aparecerá un diálogo**: "Allow USB debugging?"
   - Marca ✅ "Always allow from this computer"
   - Click en "Allow" o "Permitir"

### Verificar Conexión

```bash
adb devices
```

Deberías ver:
```
List of devices attached
192.168.1.100:5555    device
```

Si dice `unauthorized`, acepta el diálogo en el TV.

---

## 📦 Instalar ProntoTV usando ADB

### Paso a Paso

1. **Conectar al TV**:
   ```bash
   adb connect 192.168.1.100:5555
   ```

2. **Ir a la carpeta del APK**:
   ```bash
   cd e:\prontotv\cliente
   ```

3. **Instalar el APK**:
   ```bash
   adb install -r ProntoTV-Client.apk
   ```
   - `-r` significa "replace" (reemplazar si ya existe)
   - Verás una barra de progreso
   - Al final dirá: `Success`

4. **Abrir la app automáticamente**:
   ```bash
   adb shell am start -n com.prontotv.client/.MainActivity
   ```

¡Listo! La app se instalará y abrirá en el TV sin que toques nada en el TV.

---

## 🛠️ Comandos ADB Útiles

### Gestión de Conexión

```bash
# Ver dispositivos conectados
adb devices

# Conectar a un TV
adb connect 192.168.1.100:5555

# Desconectar de un TV específico
adb disconnect 192.168.1.100:5555

# Desconectar de todos
adb disconnect

# Reiniciar servidor ADB
adb kill-server
adb start-server
```

### Instalar/Desinstalar Apps

```bash
# Instalar APK
adb install -r app.apk

# Desinstalar app
adb uninstall com.prontotv.client

# Instalar y abrir
adb install -r ProntoTV-Client.apk && adb shell am start -n com.prontotv.client/.MainActivity
```

### Controlar Apps

```bash
# Abrir ProntoTV
adb shell am start -n com.prontotv.client/.MainActivity

# Cerrar ProntoTV
adb shell am force-stop com.prontotv.client

# Limpiar caché
adb shell pm clear com.prontotv.client
```

### Ver Logs

```bash
# Ver todos los logs
adb logcat

# Ver solo logs de ProntoTV
adb logcat | grep "ProntoTV"

# Limpiar logs y empezar de nuevo
adb logcat -c && adb logcat | grep "ProntoTV"

# Guardar logs en archivo
adb logcat | grep "ProntoTV" > logs.txt
```

### Copiar Archivos

```bash
# Copiar del PC al TV
adb push archivo.txt /sdcard/

# Copiar del TV al PC
adb pull /sdcard/archivo.txt .
```

### Información del Dispositivo

```bash
# Ver modelo del TV
adb shell getprop ro.product.model

# Ver versión de Android
adb shell getprop ro.build.version.release

# Ver información del sistema
adb shell dumpsys
```

---

## 🎯 Flujo de Trabajo Típico

### Instalación Inicial

```bash
# 1. Conectar
adb connect 192.168.1.100:5555

# 2. Verificar conexión
adb devices

# 3. Instalar app
cd e:\prontotv\cliente
adb install -r ProntoTV-Client.apk

# 4. Abrir app
adb shell am start -n com.prontotv.client/.MainActivity

# 5. Ver logs si hay problemas
adb logcat | grep "ProntoTV"
```

### Actualización Rápida

```bash
# Todo en un comando
adb connect 192.168.1.100:5555 && cd e:\prontotv\cliente && adb install -r ProntoTV-Client.apk && adb shell am start -n com.prontotv.client/.MainActivity
```

---

## 🔧 Solución de Problemas

### ❌ "adb: command not found"

**Causa**: ADB no está instalado o no está en el PATH

**Solución**:
1. Reinstalar ADB
2. Agregar al PATH
3. Cerrar y abrir nueva terminal

### ❌ "unable to connect to 192.168.1.100:5555"

**Causas posibles**:
- El TV no tiene ADB habilitado
- Firewall bloqueando conexión
- PC y TV en redes diferentes
- IP incorrecta

**Solución**:
1. Verificar que "Depuración por red" está habilitada en el TV
2. Verificar que ambos están en la misma WiFi
3. Hacer ping al TV: `ping 192.168.1.100`
4. Reiniciar ADB: `adb kill-server && adb start-server`

### ❌ "device unauthorized"

**Causa**: No has aceptado el diálogo en el TV

**Solución**:
1. Busca el diálogo "Allow USB debugging?" en el TV
2. Marca "Always allow from this computer"
3. Click "Allow"
4. Si no aparece, desconecta y reconecta: `adb disconnect && adb connect 192.168.1.100:5555`

### ❌ "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Causa**: Hay una versión anterior con firma diferente

**Solución**:
```bash
# Desinstalar primero
adb uninstall com.prontotv.client

# Luego instalar de nuevo
adb install -r ProntoTV-Client.apk
```

---

## 💡 Tips Pro

### Multiple TVs

Instalar en varios TVs a la vez:

```powershell
# Lista de TVs
$tvs = @("192.168.1.100", "192.168.1.101", "192.168.1.102")

foreach ($tv in $tvs) {
    Write-Host "📺 Instalando en $tv..."
    adb connect "$tv:5555"
    adb install -r ProntoTV-Client.apk
    adb shell am start -n com.prontotv.client/.MainActivity
    Write-Host "✅ Completado`n"
}
```

### Guardar IPs

Crear archivo `tvs.txt`:
```
192.168.1.100  # TV Oficina Principal
192.168.1.101  # TV Recepción
192.168.1.102  # TV Sala de Espera
```

Script para instalar en todos:
```powershell
Get-Content tvs.txt | Where-Object { $_ -match '^\d' } | ForEach-Object {
    $ip = ($_ -split '\s+')[0]
    Write-Host "📺 $ip"
    adb connect "$ip:5555"
    adb install -r ProntoTV-Client.apk
}
```

### Alias Útiles

Agregar a tu perfil de PowerShell:
```powershell
# Abrir: notepad $PROFILE

function Install-ProntoTV {
    param($ip)
    adb connect "$ip:5555"
    cd e:\prontotv\cliente
    adb install -r ProntoTV-Client.apk
    adb shell am start -n com.prontotv.client/.MainActivity
}

# Uso: Install-ProntoTV 192.168.1.100
```

---

## ✅ Ventajas de Usar ADB

vs Instalación Manual:

| Característica | ADB | Manual |
|----------------|-----|--------|
| Velocidad | ⚡ 30 segundos | 🐌 5-10 minutos |
| Comodidad | 💻 Desde tu PC | 🚶 Ir al TV |
| Múltiples TVs | ✅ Simultáneo | ❌ Uno por uno |
| Ver logs | ✅ Tiempo real | ❌ No disponible |
| Abrir app | ✅ Automático | ❌ Manual |
| Requiere configuración | ⚙️ Solo primera vez | ❌ N/A |

---

## 📝 Resumen Rápido

1. **Instalar ADB en PC** (una vez)
2. **Habilitar "Developer Options"** en TV (una vez por TV)
3. **Habilitar "Network debugging"** en TV (una vez por TV)
4. **Obtener IP del TV**
5. **Conectar**: `adb connect IP:5555`
6. **Instalar**: `adb install -r ProntoTV-Client.apk`
7. **Listo!** ✨

---

**¿Necesitas ayuda para configurar ADB? ¡Avísame y te guío paso a paso!** 🚀
