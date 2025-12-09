# Configuración de Bunny CDN con Backblaze B2

Esta guía te ayudará a configurar Bunny CDN para servir videos desde Backblaze B2, mejorando la velocidad de carga y reduciendo los costos de ancho de banda.

## Paso 1: Crear Pull Zone en Bunny CDN

1. Ve a [Bunny CDN Dashboard](https://dash.bunny.net/cdn/add)
2. Inicia sesión en tu cuenta de Bunny CDN
3. Haz clic en **"Add Pull Zone"** o **"Create Pull Zone"**
4. Configura el Pull Zone:
   - **Name**: Un nombre descriptivo (ej: `prontotv-cdn`)
   - **Origin URL**: La URL base de tu bucket B2
     - Formato: `https://s3.us-east-005.backblazeb2.com/mixercur`
     - Reemplaza `mixercur` con el nombre de tu bucket si es diferente
     - **Importante**: Bunny CDN automáticamente eliminará el nombre del bucket de la URL
   - **Origin Shield**: Opcional, pero recomendado para mejor rendimiento
   - **Cache Expiration**: Configura según tus necesidades (recomendado: 30 días)

### Cómo funciona la conversión de URLs

Bunny CDN automáticamente elimina el nombre del bucket de la URL:

- **URL Original (B2)**: `https://s3.us-east-005.backblazeb2.com/mixercur/videos/video.mp4`
- **URL Bunny CDN**: `https://prontotv-cdn.b-cdn.net/videos/video.mp4`

El sistema detecta automáticamente el bucket name (`mixercur`) y lo elimina de la ruta, manteniendo solo la estructura de carpetas y el nombre del archivo.

## Paso 2: Configurar el Pull Zone

1. Una vez creado el Pull Zone, haz clic en él para editarlo
2. En la sección **"General"**, verifica:
   - **Origin URL**: Debe apuntar a tu bucket B2
   - **Hostname**: Anota el hostname que Bunny te proporciona (ej: `prontotv-cdn.b-cdn.net`)

3. En la sección **"Optimization"**:
   - Habilita **"Enable Smart Cache"**
   - Configura **"Cache Expiration Time"** (recomendado: 2592000 segundos = 30 días)

4. En la sección **"Security"** (opcional pero recomendado):
   - Puedes configurar **Token Authentication** si quieres proteger tus videos
   - Para uso público, puedes dejarlo deshabilitado

## Paso 3: Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env` en la raíz del proyecto:

```env
# Bunny CDN Configuration
USE_BUNNY_CDN=true
BUNNY_CDN_URL=https://prontotv-cdn.b-cdn.net
```

**Nota**: Reemplaza `prontotv-cdn.b-cdn.net` con el hostname que Bunny CDN te proporcionó.

## Paso 4: Verificar la Configuración

1. Reinicia el servidor para que cargue las nuevas variables de entorno
2. Sube un video nuevo desde el admin
3. Verifica que la URL generada use el dominio de Bunny CDN en lugar de B2 directo

## Formato de URLs

### Antes (B2 directo):
```
https://s3.us-east-005.backblazeb2.com/mixercur/videos/video.mp4
https://s3.us-east-005.backblazeb2.com/mixercur/images/logo.png
```

### Después (Bunny CDN):
```
https://prontotv-cdn.b-cdn.net/videos/video.mp4
https://prontotv-cdn.b-cdn.net/images/logo.png
```

**Nota importante**: Bunny CDN automáticamente elimina el nombre del bucket (`mixercur`) de la URL. El sistema está configurado para hacer esta conversión automáticamente.

## Ventajas de usar Bunny CDN

1. **Mejor rendimiento**: Los videos se sirven desde servidores CDN más cercanos al usuario
2. **Menor latencia**: Reducción significativa en el tiempo de carga
3. **Menor costo de ancho de banda**: Bunny CDN es más económico que B2 para tráfico alto
4. **Mejor experiencia de usuario**: Videos cargan más rápido y se reproducen sin interrupciones

## Troubleshooting

### Los videos no cargan desde Bunny CDN

1. Verifica que el Pull Zone esté activo en Bunny CDN
2. Verifica que la URL del origen (Origin URL) sea correcta
3. Verifica que los archivos existan en B2 y sean públicos
4. Revisa los logs del servidor para ver si hay errores

### Las URLs siguen apuntando a B2

1. Verifica que `USE_BUNNY_CDN=true` en el archivo `.env`
2. Verifica que `BUNNY_CDN_URL` tenga el formato correcto (sin trailing slash)
3. Reinicia el servidor después de cambiar las variables de entorno

## Desactivar Bunny CDN

Si necesitas desactivar Bunny CDN temporalmente, simplemente cambia en `.env`:

```env
USE_BUNNY_CDN=false
```

O elimina la variable `USE_BUNNY_CDN`. El sistema usará las URLs directas de B2.

