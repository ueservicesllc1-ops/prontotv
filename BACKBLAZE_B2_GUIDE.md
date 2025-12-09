# Guía de Backblaze B2 para ProntoTV

## Configuración de Backblaze B2

### 1. Crear Cuenta y Bucket

1. Crea una cuenta en [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html)
2. Crea un nuevo bucket (público o privado)
3. Anota el nombre del bucket

### 2. Obtener URLs Públicas

Backblaze B2 ofrece diferentes tipos de URLs:

#### URL Pública (Recomendado para videos)
```
https://f000.backblazeb2.com/file/[bucket-name]/[file-path]
```

Ejemplo:
```
https://f000.backblazeb2.com/file/prontotv-videos/promo.mp4
```

#### URL con S3 Compatible
```
https://[bucket-name].s3.[region].backblazeb2.com/[file-path]
```

### 3. Configurar CORS

Para que los videos se reproduzcan en navegadores, configura CORS en tu bucket:

1. Ve a tu bucket en Backblaze B2
2. Click en **CORS Rules**
3. Agrega esta configuración:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Content-Type</ExposeHeader>
    <ExposeHeader>Content-Range</ExposeHeader>
    <ExposeHeader>Accept-Ranges</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

**Nota**: Para producción, considera restringir `AllowedOrigin` a tu dominio específico.

### 4. Subir Videos

#### Opción A: Interfaz Web de Backblaze
1. Ve a tu bucket
2. Click en **Upload Files**
3. Selecciona tus videos
4. Copia la URL pública generada

#### Opción B: B2 CLI

```bash
# Instalar B2 CLI
pip install b2

# Autenticar
b2 authorize-account [keyID] [applicationKey]

# Subir archivo
b2 upload-file [bucket-name] [local-file] [remote-file]

# Ejemplo
b2 upload-file prontotv-videos ./video.mp4 video.mp4
```

#### Opción C: API de B2

Puedes usar la API REST de Backblaze para subir videos programáticamente.

### 5. Usar URLs en ProntoTV

1. Obtén la URL pública de tu video
2. En el admin de ProntoTV, ve a **Videos**
3. Click en **+ Agregar Video**
4. Pega la URL de B2 en el campo **URL del Video**

### Ejemplo Completo

```javascript
// Video subido a B2
Bucket: prontotv-videos
Archivo: promociones/promo-2024.mp4

// URL pública
https://f000.backblazeb2.com/file/prontotv-videos/promociones/promo-2024.mp4

// En ProntoTV Admin
Nombre: "Promoción 2024"
URL: https://f000.backblazeb2.com/file/prontotv-videos/promociones/promo-2024.mp4
Duración: 120 (opcional)
```

## Optimización

### Compresión de Videos

Para mejor rendimiento:
- Usa formato MP4 (H.264)
- Compresión adecuada (balance entre calidad y tamaño)
- Resolución apropiada para TV (1080p o 4K según necesidad)

### CDN (Opcional)

Backblaze B2 puede combinarse con Cloudflare para CDN:
1. Configura Cloudflare en tu dominio
2. Usa Cloudflare como proxy para las URLs de B2
3. Beneficios: caché, compresión, menor latencia

## Costos

Backblaze B2 es muy económico:
- **Almacenamiento**: $0.005/GB/mes
- **Descarga**: Primeros 1GB/día gratis, luego $0.01/GB
- **Operaciones**: $0.004 por 10,000 operaciones Class C

Para un sistema de digital signage típico, los costos son muy bajos.

## Seguridad

### Buckets Privados

Si necesitas seguridad adicional:
1. Crea un bucket privado
2. Genera URLs firmadas con expiración
3. Implementa autenticación en tu backend
4. El backend genera URLs firmadas bajo demanda

### URLs Firmadas (Futuro)

Para implementar URLs firmadas, necesitarías:
- Backend que genere URLs firmadas de B2
- Autenticación en el cliente
- Renovación automática de URLs antes de expirar

## Troubleshooting

### Video no se reproduce

1. Verifica que CORS esté configurado correctamente
2. Verifica que la URL sea pública y accesible
3. Prueba la URL directamente en el navegador
4. Verifica el formato del video (MP4 recomendado)

### CORS Errors

Si ves errores de CORS:
1. Verifica la configuración CORS en B2
2. Asegúrate de que `AllowedOrigin` incluya tu dominio
3. Verifica que los headers expuestos sean correctos

### Lento para cargar

1. Considera usar CDN (Cloudflare)
2. Optimiza el tamaño del video
3. Usa compresión adecuada
4. Verifica la región de tu bucket (debe estar cerca de tus usuarios)

