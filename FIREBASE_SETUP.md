# Configuración de Firebase para ProntoTV

## Configuración Inicial

### 1. Obtener Service Account Key

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `prontotv-f3c3b`
3. Ve a **Project Settings** > **Service Accounts**
4. Click en **Generate New Private Key**
5. Descarga el archivo JSON

### 2. Configurar Backend

Tienes dos opciones:

#### Opción A: Service Account JSON (Recomendado para Producción)

1. Copia el contenido completo del JSON descargado
2. En `server/.env`, agrega:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"prontotv-f3c3b",...}
   ```
   (Todo el JSON en una sola línea)

#### Opción B: Project ID (Para Desarrollo)

En `server/.env`:
```
FIREBASE_PROJECT_ID=prontotv-f3c3b
```

Para desarrollo local, puedes usar las credenciales por defecto de Firebase Admin SDK si tienes `gcloud` configurado.

### 3. Configurar Reglas de Firestore

En Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TVs collection
    match /tvs/{tvId} {
      allow read: if true;
      allow write: if request.auth != null || request.resource.data.device_id != null;
    }
    
    // Videos collection
    match /videos/{videoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Schedules collection
    match /schedules/{scheduleId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Current playback collection
    match /current_playback/{playbackId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

**Nota**: Para producción, deberías implementar autenticación. Estas reglas permiten lectura pública pero escritura solo autenticada (excepto para registro de TVs).

### 4. Índices Necesarios

Firestore requiere índices compuestos para algunas consultas. Firebase los creará automáticamente cuando intentes usarlos, o puedes crearlos manualmente:

1. **tvs**: `device_id` (ascending)
2. **schedules**: `tv_id` (ascending), `is_active` (ascending)

## Estructura de Datos en Firestore

### Colección: `tvs`
```javascript
{
  device_id: "tv_1234567890_abc123",
  name: "TV Sala Principal",
  status: "online" | "offline",
  last_seen: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Colección: `videos`
```javascript
{
  name: "Video Promocional",
  url: "https://f000.backblazeb2.com/file/bucket/video.mp4",
  duration: 120, // segundos (opcional)
  created_at: Timestamp
}
```

### Colección: `schedules`
```javascript
{
  tv_id: "tv_document_id",
  video_id: "video_document_id",
  start_time: "09:00", // HH:MM
  end_time: "18:00" | null,
  day_of_week: 1 | null, // 0=Domingo, 6=Sábado, null=todos
  is_active: 1 | 0,
  created_at: Timestamp
}
```

### Colección: `current_playback`
```javascript
{
  tv_id: "tv_document_id",
  video_id: "video_document_id",
  started_at: Timestamp
}
```

## Backblaze B2 para Videos

### Configuración de URLs

Las URLs de Backblaze B2 tienen el formato:
```
https://[bucket-name].s3.[region].backblazeb2.com/[file-path]
```

O usando el endpoint público:
```
https://f000.backblazeb2.com/file/[bucket-name]/[file-path]
```

### Ejemplo de URL

Si tu bucket se llama `prontotv-videos` y el archivo es `promo.mp4`:
```
https://f000.backblazeb2.com/file/prontotv-videos/promo.mp4
```

### Configurar CORS en B2

Para que los videos se reproduzcan en el navegador, configura CORS en tu bucket B2:

1. Ve a tu bucket en Backblaze B2
2. Configura CORS con:
   ```xml
   <CORSConfiguration>
     <CORSRule>
       <AllowedOrigin>*</AllowedOrigin>
       <AllowedMethod>GET</AllowedMethod>
       <AllowedMethod>HEAD</AllowedMethod>
       <AllowedHeader>*</AllowedHeader>
       <ExposeHeader>Content-Length</ExposeHeader>
       <ExposeHeader>Content-Type</ExposeHeader>
       <MaxAgeSeconds>3600</MaxAgeSeconds>
     </CORSRule>
   </CORSConfiguration>
   ```

### Subir Videos a B2

Puedes usar:
- **B2 CLI**: `b2 upload-file [bucket-name] [local-file] [remote-file]`
- **API de B2**: Usa la API REST de Backblaze
- **Interfaz Web**: Desde el panel de Backblaze

Luego copia la URL pública y úsala en el admin de ProntoTV.

## Migración desde SQLite

Si tenías datos en SQLite, puedes migrarlos:

1. Exporta los datos de SQLite a JSON
2. Usa un script de migración para importarlos a Firestore
3. Asegúrate de convertir los IDs numéricos a referencias de documentos

## Verificación

Para verificar que todo funciona:

1. Inicia el servidor: `npm run dev:server`
2. Deberías ver: `🔥 Using Firebase Firestore`
3. Prueba crear un TV desde el cliente
4. Verifica en Firebase Console que aparezca en la colección `tvs`

