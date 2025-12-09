# ProntoTV - Sistema de Gestión de Contenido Digital

Sistema completo para gestionar y reproducir videos en TVs Android mediante programación remota.

## Estructura del Proyecto

- **cliente/**: Webapp que se empaqueta como APK para TVs Android
- **admin/**: Webapp de administración para gestionar TVs y programar videos
- **server/**: Backend API para conectar cliente y admin

## Características

- ✅ **Firebase Firestore** para almacenamiento de datos
- ✅ **Backblaze B2** para almacenamiento de videos
- ✅ **Subida directa de videos** desde el admin a B2
- ✅ Reproducción de videos desde URLs (B2, Bunny, etc.)
- ✅ Programación de horarios por TV
- ✅ Panel de administración web
- ✅ Gestión múltiple de TVs
- ✅ Sincronización en tiempo real

## Instalación

### Backend y Admin

```bash
npm install
cd admin && npm install
cd ../server && npm install
```

### Desarrollo

```bash
npm run dev
```

Esto iniciará:
- Backend API en http://localhost:3000
- Admin webapp en http://localhost:5173

### Producción

```bash
npm run build:admin
npm start
```

## Empaquetar Cliente como APK

El cliente está en la carpeta `cliente/`. Para empaquetarlo como APK:

1. Usar Cordova o Capacitor
2. Configurar Android WebView
3. Build APK

Ver `cliente/README.md` para más detalles.

## Configuración

### Firebase

1. Configura Firebase siguiendo `FIREBASE_SETUP.md`
2. Crea archivo `.env` en la carpeta `server/`:

```
PORT=3000
FIREBASE_PROJECT_ID=prontotv-f3c3b
```

O para producción con Service Account:
```
PORT=3000
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Backblaze B2

Las credenciales de B2 ya están configuradas. El bucket `mixercur` está listo para usar.

**Subir videos:**
- Desde el admin: Selecciona "Subir a B2" al agregar un video
- O usa URLs existentes: Selecciona "Usar URL"

Ver `B2_UPLOAD_GUIDE.md` para más detalles sobre la subida de archivos.
Ver `FIREBASE_SETUP.md` para configuración de CORS en B2.

