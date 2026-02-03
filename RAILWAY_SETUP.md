# Configuración de Variables de Entorno para Railway

Este documento explica cómo configurar las variables de entorno en Railway para el proyecto ProntoTV.

## Variables Requeridas

### 1. Firebase Configuration

#### FIREBASE_PROJECT_ID
- **Descripción**: ID del proyecto de Firebase
- **Valor**: `prontotv-f3c3b`
- **Requerido**: Sí

#### FIREBASE_SERVICE_ACCOUNT
- **Descripción**: JSON completo del Service Account de Firebase como string (una sola línea)
- **Cómo obtenerlo**:
  1. Ve a Firebase Console → Project Settings → Service Accounts
  2. Haz clic en "Generate new private key"
  3. Descarga el archivo JSON
  4. Convierte el JSON a una sola línea (sin saltos de línea)
  5. Escapa las comillas dobles con `\"`
  6. Pega el resultado completo en Railway
- **Formato**: `{"type":"service_account","project_id":"...","private_key":"...",...}`
- **Requerido**: Sí (o usar GOOGLE_APPLICATION_CREDENTIALS)

**Alternativa**: Si prefieres usar un archivo, puedes usar `GOOGLE_APPLICATION_CREDENTIALS` apuntando a la ruta del archivo JSON.

### 2. Backblaze B2 Configuration

#### B2_ENDPOINT
- **Descripción**: Endpoint de Backblaze B2
- **Valor**: `https://s3.us-east-005.backblazeb2.com`
- **Requerido**: Sí

#### B2_KEY_ID
- **Descripción**: Key ID de Backblaze B2
- **Cómo obtenerlo**: Backblaze B2 Dashboard → App Keys
- **Requerido**: Sí

#### B2_APPLICATION_KEY
- **Descripción**: Application Key de Backblaze B2
- **Cómo obtenerlo**: Backblaze B2 Dashboard → App Keys
- **Requerido**: Sí

#### B2_BUCKET_NAME
- **Descripción**: Nombre del bucket de B2
- **Valor**: `mixercur` (o el nombre de tu bucket)
- **Requerido**: Sí

### 3. Bunny CDN Configuration (Opcional)

#### USE_BUNNY_CDN
- **Descripción**: Activar/desactivar Bunny CDN
- **Valores**: `true` o `false`
- **Requerido**: No (default: `false`)

#### BUNNY_CDN_URL
- **Descripción**: URL base del Bunny CDN
- **Valor**: `https://prontotv2.b-cdn.net` (o tu URL de Bunny CDN)
- **Requerido**: Solo si `USE_BUNNY_CDN=true`

### 4. Server Configuration

#### PORT
- **Descripción**: Puerto del servidor
- **Valor**: `3000` (Railway lo puede asignar automáticamente)
- **Requerido**: No (Railway asigna automáticamente)

#### DOMAIN
- **Descripción**: Dominio principal de la aplicación
- **Valor**: `prontoenvios.click`
- **Requerido**: No (opcional, para referencia)

#### ALLOWED_ORIGINS
- **Descripción**: Lista de orígenes permitidos para CORS (separados por comas)
- **Valor**: `https://prontoenvios.click,https://www.prontoenvios.click,http://localhost:3000,http://localhost:5173`
- **Requerido**: No (default: localhost)
- **Nota**: Incluye todos los dominios desde los que se accederá a la API

## Cómo Configurar en Railway

1. Ve a tu proyecto en Railway
2. Haz clic en tu servicio
3. Ve a la pestaña "Variables"
4. Haz clic en "New Variable"
5. Agrega cada variable una por una con su valor correspondiente

### Importante para FIREBASE_SERVICE_ACCOUNT

El valor de `FIREBASE_SERVICE_ACCOUNT` debe ser el JSON completo en una sola línea. Ejemplo:

```json
{"type":"service_account","project_id":"prontotv-f3c3b","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@prontotv-f3c3b.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40prontotv-f3c3b.iam.gserviceaccount.com"}
```

**Nota**: Los saltos de línea en `private_key` deben ser `\n` (no saltos de línea reales).

## Verificación

Después de configurar todas las variables, Railway reiniciará automáticamente el servicio. Verifica que el servicio esté funcionando correctamente revisando los logs.

## Troubleshooting

- **Error de Firebase**: Verifica que `FIREBASE_SERVICE_ACCOUNT` esté en formato JSON válido (una sola línea)
- **Error de B2**: Verifica que las credenciales de B2 sean correctas
- **Error de Bunny CDN**: Si no usas Bunny CDN, asegúrate de que `USE_BUNNY_CDN=false` o no configures `BUNNY_CDN_URL`

