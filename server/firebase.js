const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
// Cargar variables de entorno desde la raíz del proyecto
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Inicializar Firebase Admin
if (!admin.apps.length) {
  let serviceAccount = null;

  // Opción 1: Desde variable de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('Error parseando FIREBASE_SERVICE_ACCOUNT desde .env');
    }
  }

  // Opción 2: Desde archivo JSON en public/
  if (!serviceAccount) {
    const jsonPath = path.join(__dirname, '../public/prontotv-f3c3b-firebase-adminsdk-fbsvc-409fba3e54.json');
    if (fs.existsSync(jsonPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log('✅ Service Account cargado desde archivo JSON');
      } catch (e) {
        console.error('Error leyendo Service Account JSON:', e.message);
      }
    }
  }

  // Opción 3: Desde GOOGLE_APPLICATION_CREDENTIALS
  if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(credPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        console.log('✅ Service Account cargado desde GOOGLE_APPLICATION_CREDENTIALS');
      } catch (e) {
        console.error('Error leyendo Service Account desde GOOGLE_APPLICATION_CREDENTIALS:', e.message);
      }
    }
  }

  if (serviceAccount) {
    // Usar Service Account JSON
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase inicializado con Service Account');
  } else {
    // Intentar usar Application Default Credentials (gcloud)
    // O inicializar con Project ID (requiere GOOGLE_APPLICATION_CREDENTIALS o gcloud auth)
    try {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'prontotv-f3c3b'
      });
      console.log('✅ Firebase inicializado con Project ID');
      console.log('   Usando Application Default Credentials o variables de entorno');
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error.message);
      console.error('');
      console.error('Para usar Firestore, configura una de estas opciones:');
      console.error('1. FIREBASE_SERVICE_ACCOUNT en server/.env (JSON completo en una línea)');
      console.error('2. Coloca el archivo JSON del Service Account en public/');
      console.error('3. GOOGLE_APPLICATION_CREDENTIALS apuntando a un archivo JSON');
      console.error('4. Ejecuta: gcloud auth application-default login');
      console.error('');
      throw new Error('Firebase no está configurado. Ver FIREBASE_SETUP.md para más información.');
    }
  }
}

const db = admin.firestore();

// Colecciones
const COLLECTIONS = {
  TVS: 'tvs',
  VIDEOS: 'videos',
  SCHEDULES: 'schedules',
  CURRENT_PLAYBACK: 'current_playback',
  PLAYLISTS: 'playlists'
};

// Helper para convertir timestamps
const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper para convertir a Firestore timestamp
const toTimestamp = (date) => {
  if (!date) return admin.firestore.FieldValue.serverTimestamp();
  if (date instanceof Date) return admin.firestore.Timestamp.fromDate(date);
  return admin.firestore.Timestamp.fromDate(new Date(date));
};

module.exports = {
  db,
  COLLECTIONS,
  toDate,
  toTimestamp,
  admin
};

