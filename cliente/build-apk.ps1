# Script para generar el APK de ProntoTV Cliente
# Ejecutar desde la carpeta cliente: .\build-apk.ps1

Write-Host "🔨 Generando APK de ProntoTV Cliente..." -ForegroundColor Cyan

# Paso 0: Actualizar versión
Write-Host "`n📝 Actualizando versión..." -ForegroundColor Yellow
$versionFile = "www\version.json"
if (Test-Path $versionFile) {
    $versionData = Get-Content $versionFile | ConvertFrom-Json
    $versionData.buildNumber = $versionData.buildNumber + 1
    $versionData.buildDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    $versionData | ConvertTo-Json | Set-Content $versionFile
    Write-Host "✅ Versión actualizada: $($versionData.version) (Build $($versionData.buildNumber))" -ForegroundColor Green
} else {
    Write-Host "⚠️ Archivo version.json no encontrado, creando uno nuevo..." -ForegroundColor Yellow
    $versionData = @{
        version = "1.0.0"
        buildNumber = 1
        buildDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
        downloadUrl = "https://drive.google.com/uc?export=download&id=1-joJv2LvPmZ97ltgRIxPGd7bXFYRNPMN"
        releaseNotes = "Versión inicial de ProntoTV Cliente"
    }
    $versionData | ConvertTo-Json | Set-Content $versionFile
}

# Paso 1: Copiar archivos a www
Write-Host "`n📁 Copiando archivos a www..." -ForegroundColor Yellow
Copy-Item -Path index.html,app.js,config.js,firebase.js,styles.css,logo.png,videos.html -Destination www\ -Force -ErrorAction SilentlyContinue

# Paso 2: Sincronizar con Capacitor
Write-Host "`n🔄 Sincronizando con Capacitor..." -ForegroundColor Yellow
npx cap sync android

# Paso 3: Construir APK
Write-Host "`n🏗️  Construyendo APK (esto puede tomar varios minutos)..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..

# Paso 4: Copiar APK a la raíz
Write-Host "`n📦 Copiando APK..." -ForegroundColor Yellow
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk .\ProntoTV-Client.apk -Force

# Mostrar información del APK
Write-Host "`n✅ APK generado exitosamente!" -ForegroundColor Green
Get-Item .\ProntoTV-Client.apk | Format-List Name, Length, LastWriteTime, FullName

Write-Host "`n📱 El APK está listo para instalar en dispositivos Android." -ForegroundColor Green
Write-Host "📍 Ubicación: $((Get-Item .\ProntoTV-Client.apk).FullName)" -ForegroundColor Cyan
Write-Host "`n🔄 Versión: $($versionData.version) (Build $($versionData.buildNumber))" -ForegroundColor Cyan
Write-Host "`n💡 Recuerda subir el APK a Google Drive para que las apps puedan actualizarse automáticamente." -ForegroundColor Yellow
