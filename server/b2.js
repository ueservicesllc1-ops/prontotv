const AWS = require('aws-sdk');
const path = require('path');
// Cargar variables de entorno desde la raíz del proyecto
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuración de Backblaze B2 usando S3 Compatible API
const B2_CONFIG = {
  endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  accessKeyId: process.env.B2_KEY_ID || '005c2b526be0baa0000000027',
  secretAccessKey: process.env.B2_APPLICATION_KEY || 'K0051S0XRMElL2TrhLRqTpF4zxkmr40',
  region: 'us-east-005',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
};

// Inicializar S3 client para B2
const s3 = new AWS.S3(B2_CONFIG);

const BUCKET_NAME = process.env.B2_BUCKET_NAME || 'mixercur';

/**
 * Subir archivo a B2
 * @param {Buffer|Stream} fileBuffer - Buffer o stream del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} contentType - Tipo MIME del archivo
 * @param {string} folder - Carpeta opcional donde guardar
 * @returns {Promise<Object>} URL pública y metadata del archivo
 */
async function uploadFile(fileBuffer, fileName, contentType, folder = '') {
  try {
    const key = folder ? `${folder}/${fileName}` : fileName;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read', // Hacer el archivo público
      CacheControl: 'max-age=31536000' // Cache por 1 año
    };

    const result = await s3.upload(params).promise();
    
    // Generar URL pública (B2 usa el endpoint S3)
    // result.Location puede tener el formato correcto o necesitamos construirlo
    let publicUrl = result.Location;
    
    // Si la URL no está en el formato correcto, construirla manualmente
    if (!publicUrl || !publicUrl.includes(BUCKET_NAME)) {
      publicUrl = `${B2_CONFIG.endpoint}/${BUCKET_NAME}/${key}`;
    }
    
    // Si está configurado Bunny CDN, convertir la URL
    const finalUrl = process.env.USE_BUNNY_CDN === 'true' 
      ? convertToBunnyCDN(publicUrl) 
      : publicUrl;
    
    return {
      success: true,
      url: finalUrl,
      b2Url: publicUrl, // Guardar también la URL original de B2
      cdnUrl: process.env.USE_BUNNY_CDN === 'true' ? finalUrl : null,
      key: key,
      bucket: BUCKET_NAME,
      size: fileBuffer.length || 0,
      etag: result.ETag
    };
  } catch (error) {
    console.error('Error uploading to B2:', error);
    throw new Error(`Error al subir archivo a B2: ${error.message}`);
  }
}

/**
 * Eliminar archivo de B2
 * @param {string} key - Key del archivo a eliminar
 * @returns {Promise<boolean>}
 */
async function deleteFile(key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from B2:', error);
    throw new Error(`Error al eliminar archivo de B2: ${error.message}`);
  }
}

/**
 * Listar archivos en B2
 * @param {string} prefix - Prefijo para filtrar archivos (carpeta)
 * @returns {Promise<Array>}
 */
async function listFiles(prefix = '') {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix
    };

    const result = await s3.listObjectsV2(params).promise();
    
    return result.Contents.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      url: `${B2_CONFIG.endpoint}/${BUCKET_NAME}/${item.Key}`
    }));
  } catch (error) {
    console.error('Error listing B2 files:', error);
    throw new Error(`Error al listar archivos de B2: ${error.message}`);
  }
}

/**
 * Obtener URL pública de un archivo
 * @param {string} key - Key del archivo
 * @param {boolean} useCDN - Si usar CDN de Bunny en lugar de B2 directo
 * @returns {string} URL pública
 */
function getPublicUrl(key, useCDN = false) {
  const b2Url = `${B2_CONFIG.endpoint}/${BUCKET_NAME}/${key}`;
  
  // Si se solicita usar CDN y está configurado
  if (useCDN && process.env.BUNNY_CDN_URL) {
    const bunnyUrl = process.env.BUNNY_CDN_URL.replace(/\/$/, ''); // Remover trailing slash
    // Extraer el path del archivo desde la URL de B2
    const filePath = key;
    return `${bunnyUrl}/${filePath}`;
  }
  
  return b2Url;
}

/**
 * Convertir URL de B2 a URL de Bunny CDN
 * @param {string} b2Url - URL de B2
 * @returns {string} URL de Bunny CDN
 * 
 * Ejemplo:
 * B2: https://s3.us-east-005.backblazeb2.com/mixercur/videos/video.mp4
 * Bunny: https://prontotv-cdn.b-cdn.net/videos/video.mp4
 */
function convertToBunnyCDN(b2Url) {
  if (!process.env.BUNNY_CDN_URL) {
    console.log('[Bunny CDN] BUNNY_CDN_URL no configurado');
    return b2Url; // Si no hay CDN configurado, devolver URL original
  }
  
  if (!b2Url || typeof b2Url !== 'string') {
    console.warn('[Bunny CDN] URL inválida:', b2Url);
    return b2Url;
  }
  
  const bunnyUrl = process.env.BUNNY_CDN_URL.replace(/\/$/, ''); // Remover trailing slash
  
  try {
    // Si la URL ya es de Bunny CDN, no convertir
    if (b2Url.includes('b-cdn.net')) {
      console.log('[Bunny CDN] URL ya es de Bunny CDN:', b2Url);
      return b2Url;
    }
    
    // Si la URL es relativa, construir la URL completa de B2 primero
    let fullB2Url = b2Url;
    if (b2Url.startsWith('/')) {
      fullB2Url = `https://s3.us-east-005.backblazeb2.com${b2Url}`;
      console.log('[Bunny CDN] URL relativa convertida a absoluta:', fullB2Url);
    }
    
    // Parsear la URL de B2
    const urlObj = new URL(fullB2Url);
    const pathParts = urlObj.pathname.split('/').filter(part => part); // Filtrar partes vacías
    
    // Buscar el índice del bucket name
    const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME);
    
    if (bucketIndex === -1) {
      console.warn(`[Bunny CDN] No se encontró el bucket "${BUCKET_NAME}" en la URL: ${fullB2Url}`);
      console.warn(`[Bunny CDN] Path parts:`, pathParts);
      return b2Url; // No se puede convertir, devolver original
    }
    
    // Obtener todo después del bucket name (la ruta del archivo)
    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    if (!filePath) {
      console.warn(`[Bunny CDN] No se pudo extraer la ruta del archivo de: ${fullB2Url}`);
      return b2Url;
    }
    
    const bunnyCdnUrl = `${bunnyUrl}/${filePath}`;
    console.log(`[Bunny CDN] ✅ Convertido: ${fullB2Url} -> ${bunnyCdnUrl}`);
    
    return bunnyCdnUrl;
  } catch (error) {
    console.error(`[Bunny CDN] ❌ Error al convertir URL ${b2Url}:`, error.message);
    console.error(`[Bunny CDN] Stack:`, error.stack);
    return b2Url; // En caso de error, devolver URL original
  }
}

/**
 * Generar URL firmada (para archivos privados)
 * @param {string} key - Key del archivo
 * @param {number} expiresIn - Segundos hasta expiración (default: 1 hora)
 * @returns {string} URL firmada
 */
function getSignedUrl(key, expiresIn = 3600) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn
  };

  return s3.getSignedUrl('getObject', params);
}

module.exports = {
  uploadFile,
  deleteFile,
  listFiles,
  getPublicUrl,
  getSignedUrl,
  convertToBunnyCDN,
  BUCKET_NAME,
  B2_CONFIG
};

