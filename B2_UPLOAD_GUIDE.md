# Guía de Subida de Videos a Backblaze B2

## Configuración

Las credenciales de B2 ya están configuradas en el código. Si necesitas cambiarlas, edita `server/.env`:

```env
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_KEY_ID=005c2b526be0baa0000000027
B2_APPLICATION_KEY=K0051S0XRMElL2TrhLRqTpF4zxkmr40
B2_BUCKET_NAME=mixercur
```

## Uso desde el Admin

### Subir Video Directamente

1. Ve a la pestaña **Videos** en el admin
2. Click en **+ Agregar Video**
3. Selecciona **"Subir a B2"**
4. Selecciona el archivo de video desde tu computadora
5. (Opcional) Especifica una carpeta en B2 (por defecto: `videos`)
6. Ingresa el nombre del video
7. (Opcional) Ingresa la duración en segundos
8. Click en **Subir y Agregar**

El video se subirá automáticamente a B2 y se agregará a la base de datos con la URL pública.

### Usar URL Existente

Si ya tienes un video en B2 o en otro servidor:

1. Selecciona **"Usar URL"**
2. Pega la URL del video
3. Completa el nombre y duración
4. Click en **Agregar**

## Estructura en B2

Los videos se organizan en carpetas dentro del bucket `mixercur`:

```
mixercur/
  ├── videos/
  │   ├── video1.mp4
  │   ├── video2.mp4
  │   └── promociones/
  │       └── promo-2024.mp4
```

## URLs Generadas

Después de subir, las URLs tendrán el formato:

```
https://s3.us-east-005.backblazeb2.com/mixercur/videos/nombre_archivo.mp4
```

## Límites

- **Tamaño máximo**: 500MB por archivo
- **Formatos soportados**: MP4, WebM, OGG, QuickTime, AVI
- **Tiempo de subida**: Depende del tamaño del archivo y tu conexión

## API Endpoints

### Subir Video

```bash
POST /api/upload
Content-Type: multipart/form-data

Form Data:
- video: [archivo]
- name: "Nombre del video"
- folder: "videos" (opcional)
```

### Listar Archivos

```bash
GET /api/b2/files?folder=videos
```

### Eliminar Archivo

```bash
DELETE /api/b2/files/:key
```

## Troubleshooting

### Error de Subida

- Verifica que el archivo no exceda 500MB
- Verifica que el formato sea compatible (MP4 recomendado)
- Verifica las credenciales de B2 en `.env`

### CORS Errors

Si los videos no se reproducen después de subirlos:

1. Ve a tu bucket en Backblaze B2
2. Configura CORS (ver `FIREBASE_SETUP.md`)
3. Asegúrate de que el bucket sea público

### Lento para Subir

- Comprime el video antes de subir
- Usa formato MP4 con H.264
- Considera subir durante horas de menor tráfico

## Seguridad

Las credenciales de B2 están en el servidor. El cliente nunca tiene acceso directo a las credenciales. Todas las subidas pasan por el servidor que actúa como proxy.

Para producción, considera:
- Rotar las credenciales periódicamente
- Usar variables de entorno seguras
- Implementar autenticación en los endpoints de subida

