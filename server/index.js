const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
// Cargar variables de entorno desde la raíz del proyecto
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db, COLLECTIONS, toDate, toTimestamp, admin } = require('./firebase');
const { uploadFile, deleteFile, listFiles, getPublicUrl, convertToBunnyCDN } = require('./b2');


const app = express();

// ========== CACHÉ SIMPLE EN MEMORIA ==========
// Para reducir lecturas a Firestore y evitar exceder la cuota
const cache = {
  data: {},
  set: function (key, value, ttlSeconds = 180) { // Aumentado a 3 minutos (180s) para reducir lecturas de Firestore
    this.data[key] = {
      value: value,
      expires: Date.now() + (ttlSeconds * 1000)
    };
  },
  get: function (key) {
    const item = this.data[key];
    if (!item) return null;
    if (Date.now() > item.expires) {
      delete this.data[key];
      return null;
    }
    return item.value;
  },
  clear: function (key) {
    if (key) {
      delete this.data[key];
    } else {
      this.data = {};
    }
  }
};


// Middleware
// Configurar CORS con dominios permitidos
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

const http = require('http').createServer(app);
const { Server } = require('socket.io');
const PORT = process.env.PORT || 3000;

// Configurar Socket.io con CORS
const io = new Server(http, {
  pingTimeout: 5000, // Detectar desconexión en 5s
  pingInterval: 2000, // Enviar ping cada 2s
  cors: {
    origin: (origin, callback) => {
      // Permitir requests sin origin, capacitor, file, localhost (Android TV)
      if (!origin || origin.startsWith('capacitor://') || origin.startsWith('file://') || origin === 'https://localhost') {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn('❌ Socket.io CORS blocked:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Capacitor, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Permitiendo request sin origin (mobile app/Capacitor)');
      return callback(null, true);
    }

    // Permitir capacitor:// y file:// origins
    if (origin.startsWith('capacitor://') || origin.startsWith('file://') || origin === 'https://localhost') {
      console.log('✅ CORS: Permitiendo origin de Capacitor:', origin);
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      console.log('✅ CORS: Permitiendo origin:', origin);
      callback(null, true);
    } else {
      console.warn('❌ CORS: Bloqueando origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(bodyParser.json());

// Servir admin solo si existe el directorio dist
const fs = require('fs');
const adminDistPath = path.join(__dirname, '../admin/dist');
if (fs.existsSync(adminDistPath)) {
  app.use(express.static(adminDistPath));
  console.log('✅ Admin panel disponible en /admin/dist');
} else {
  console.warn('⚠️ Admin panel no compilado. Ejecuta: npm run build');
}

// Servir cliente en /client
app.use('/client', express.static(path.join(__dirname, '../cliente')));

// Configurar multer para subida de archivos (memoria)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar videos e imágenes
    const allowedMimes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video (MP4, WebM, etc.) o imagen (JPG, PNG, GIF, WEBP, SVG)'), false);
    }
  }
});

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== USER MANAGEMENT ENDPOINTS ==========

// Create user with email and password
app.post('/api/users/create', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!role || (role !== 'admin' && role !== 'editor')) {
      return res.status(400).json({ error: 'Role must be either "admin" or "editor"' });
    }

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: false
    });

    // Store user role in Firestore
    await db.collection('users').doc(email).set({
      email: email,
      role: role,
      uid: userRecord.uid,
      createdAt: toTimestamp(new Date())
    });

    res.json({
      success: true,
      user: {
        email: email,
        role: role,
        uid: userRecord.uid
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    } else if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Get user from Firestore to get UID
    const userDoc = await db.collection('users').doc(email).get();

    if (userDoc.exists) {
      const userData = userDoc.data();

      // Delete from Firebase Authentication if UID exists
      if (userData.uid) {
        try {
          await admin.auth().deleteUser(userData.uid);
        } catch (authError) {
          console.error('Error deleting user from Auth:', authError);
          // Continue anyway to delete from Firestore
        }
      }

      // Delete from Firestore
      await db.collection('users').doc(email).delete();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user password
app.post('/api/update-user-password', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Get user from Firestore to get UID
    const userDoc = await db.collection('users').doc(email).get();

    let uid = null;
    if (userDoc.exists) {
      const userData = userDoc.data();
      uid = userData.uid;
    }

    // If no UID in Firestore, try to get user by email from Firebase Auth
    if (!uid) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        uid = userRecord.uid;

        // Update Firestore with the UID if it doesn't exist
        await db.collection('users').doc(email).set({
          uid: uid
        }, { merge: true });
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          // User doesn't exist in Firebase Auth, create them
          const newUser = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: false
          });

          // Update Firestore with UID
          await db.collection('users').doc(email).set({
            uid: newUser.uid
          }, { merge: true });

          return res.json({
            success: true,
            message: 'Usuario creado en Firebase Auth y contraseña establecida',
            uid: newUser.uid
          });
        }
        throw authError;
      }
    }

    // Update password in Firebase Authentication
    await admin.auth().updateUser(uid, {
      password: password
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      uid: uid
    });
  } catch (error) {
    console.error('Error updating password:', error);

    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'Usuario no encontrado en Firebase Authentication' });
    } else if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Contraseña inválida' });
    }

    res.status(500).json({ error: error.message });
  }
});


// ========== TV ENDPOINTS ==========

// Register or update TV
app.post('/api/tvs/register', async (req, res) => {
  // Clear cache to reflect new/updated TV
  cache.clear('all_tvs');

  // Timeout de 3 segundos
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      const { device_id, name } = req.body;
      res.json({
        id: 'temp_' + Date.now(),
        device_id,
        name: name || `TV-${device_id.slice(-6)}`,
        status: 'online',
        message: 'Registrado (modo offline)'
      });
    }
  }, 3000);

  try {
    const { device_id, name, version } = req.body;

    if (!device_id) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'device_id is required' });
    }

    // Buscar TV existente por device_id
    const tvsRef = db.collection(COLLECTIONS.TVS);
    const snapshot = await Promise.race([
      tvsRef.where('device_id', '==', device_id).limit(1).get().catch(err => {
        console.error('Error en Firestore:', err);
        return { empty: true, docs: [] };
      }),
      new Promise((resolve) => setTimeout(() => resolve({ empty: true, docs: [] }), 2000))
    ]);

    // Obtener IP y Location
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

    // Limpiar IP formato IPv6 mapped IPv4 (::ffff:127.0.0.1)
    if (ip && ip.includes('::ffff:')) ip = ip.replace('::ffff:', '');

    // Obtener ubicación
    let location = null;
    try {
      if (ip && ip !== '::1' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        console.log(`[Geo] Buscando ubicación para IP: ${ip}`);
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon`);
        const geoData = await geoResponse.json();

        if (geoData.status === 'success') {
          location = {
            country: geoData.country,
            countryCode: geoData.countryCode,
            region: geoData.regionName,
            city: geoData.city,
            lat: geoData.lat,
            lon: geoData.lon
          };
          console.log(`[Geo] Ubicación encontrada: ${location.city}, ${location.country}`);
        }
      }
    } catch (geoError) {
      console.error('[Geo] Error obteniendo ubicación:', geoError);
    }

    let tvData = {
      device_id,
      name: name || `TV-${device_id.slice(-6)}`,
      version: version || 'Unknown',
      status: 'online',
      ip: ip || null,
      location: location || null,
      last_seen: toTimestamp(new Date()),
      updated_at: toTimestamp(new Date())
    };

    if (snapshot.empty) {
      // Crear nuevo TV
      tvData.created_at = toTimestamp(new Date());
      const docRef = await tvsRef.add(tvData);
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.json({ id: docRef.id, ...tvData, device_id, name: tvData.name });
      }
    } else {
      // Actualizar TV existente - NO sobrescribir el nombre personalizado
      const doc = snapshot.docs[0];
      const existingData = doc.data();

      // Preservar el nombre existente - NO sobrescribir con nombre por defecto del cliente
      const existingName = existingData.name || '';
      const incomingName = name || `TV-${device_id.slice(-6)}`;

      // Detectar si el nombre entrante es el predeterminado (formato TV-XXXXXX)
      const isDefaultIncomingName = incomingName.match(/^TV-[a-z0-9]{6,9}$/i);

      // Actualizar solo los campos necesarios, preservando el nombre personalizado
      const updateData = {
        status: 'online',
        version: version || 'Unknown',
        ip: ip || null,
        location: location || null,
        last_seen: toTimestamp(new Date()),
        updated_at: toTimestamp(new Date())
      };

      // Si el TV ya tiene un nombre personalizado (no es el predeterminado),
      // y el nombre entrante es el predeterminado, NO sobrescribir
      if (existingName && existingName.trim() !== '' && isDefaultIncomingName) {
        // Mantener el nombre personalizado existente
        updateData.name = existingName;
        console.log(`[TV Register] Preservando nombre personalizado: "${existingName}" (ignorando nombre por defecto del cliente)`);
      } else if (existingName && existingName.trim() !== '') {
        // Si hay nombre existente y el entrante no es predeterminado, mantener el existente
        updateData.name = existingName;
      } else {
        // Si no hay nombre existente, usar el entrante
        updateData.name = incomingName;
      }

      await doc.ref.update(updateData);

      clearTimeout(timeout);
      if (!res.headersSent) {
        res.json({
          id: doc.id,
          ...existingData,
          ...updateData,
          device_id,
          name: updateData.name
        });
      }
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error registering TV:', error);
    if (!res.headersSent) {
      res.json({
        id: 'temp_' + Date.now(),
        device_id: req.body.device_id,
        name: req.body.name || `TV-${req.body.device_id?.slice(-6)}`,
        status: 'online',
        message: 'Registrado (modo offline)'
      });
    }
  }
});

// Obtener todas las TVs
app.get('/api/tvs', async (req, res) => {
  // 1. Intentar servir desde caché
  const cachedTVs = cache.get('all_tvs');
  if (cachedTVs) {
    // Actualizar estados online/offline en tiempo real aunque venga de caché
    const processedTVs = cachedTVs.map(tv => {
      if (!tv.last_seen) return { ...tv, status: 'offline' };
      const lastSeen = new Date(tv.last_seen);
      const now = new Date();
      const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60);
      return {
        ...tv,
        status: minutesSinceLastSeen < 3 ? 'online' : 'offline'
      };
    });
    console.log(`[GET /api/tvs] 🟢 Sirviendo ${processedTVs.length} TVs desde memoria`);
    return res.json(processedTVs);
  }

  console.log('[GET /api/tvs] 🔵 Consultando Firestore (Cache Miss)...');

  // Timeout de 3 segundos
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn('[GET /api/tvs] ⚠️ Timeout alcanzado, retornando array vacío');
      res.json([]);
    }
  }, 3000);

  try {
    const snapshot = await Promise.race([
      db.collection(COLLECTIONS.TVS)
        .orderBy('created_at', 'desc')
        .get()
        .catch(err => {
          console.error('[GET /api/tvs] ❌ Error obteniendo TVs:', err);
          return { docs: [] };
        }),
      new Promise((resolve) => setTimeout(() => resolve({ docs: [] }), 2000))
    ]);

    clearTimeout(timeout);

    console.log(`[GET /api/tvs] ✅ TVs encontradas: ${snapshot.docs.length}`);

    const tvs = snapshot.docs.map(doc => {
      const data = doc.data();
      // Calcular status y formatear fechas
      const lastSeen = toDate(data.last_seen);
      const now = new Date();
      const minutesSinceLastSeen = lastSeen ? (now - lastSeen) / (1000 * 60) : Infinity;
      const status = minutesSinceLastSeen < 3 ? 'online' : 'offline';

      return {
        id: doc.id,
        ...data,
        status,
        created_at: toDate(data.created_at)?.toISOString(),
        last_seen: toDate(data.last_seen)?.toISOString()
      };
    });

    // 2. Guardar en caché (TTL 60 segundos)
    if (snapshot.docs.length > 0) {
      cache.set('all_tvs', tvs, 60);
      console.log('[GET /api/tvs] 💾 Almacenado en caché (60s)');
    }

    if (!res.headersSent) {
      res.json(tvs);
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('[GET /api/tvs] ❌ Error en catch:', error);
    if (!res.headersSent) {
      res.json([]);
    }
  }
});

// Actualizar TV (nombre o aspect_ratio)
app.patch('/api/tvs/:id', async (req, res) => {
  cache.clear('all_tvs'); // Invalidate cache
  try {
    const { name, aspect_ratio } = req.body;

    // Validar que al menos un campo se esté actualizando
    if (name === undefined && aspect_ratio === undefined) {
      return res.status(400).json({ error: 'At least one field (name or aspect_ratio) must be provided' });
    }

    const docRef = db.collection(COLLECTIONS.TVS).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'TV not found' });
    }

    const updateData = {
      updated_at: toTimestamp(new Date())
    };

    // Solo validar name si se está actualizando
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateData.name = name.trim();
    }

    // Validar aspect_ratio si se está actualizando
    if (aspect_ratio !== undefined) {
      if (aspect_ratio !== '16:9' && aspect_ratio !== '9:16') {
        console.log(`[PATCH /api/tvs/:id] ❌ aspect_ratio inválido: ${aspect_ratio}`);
        return res.status(400).json({ error: 'aspect_ratio must be "16:9" or "9:16"' });
      }
      console.log(`[PATCH /api/tvs/:id] ✅ Actualizando aspect_ratio a: ${aspect_ratio}`);
      updateData.aspect_ratio = aspect_ratio;
    }

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();

    res.json({
      id: updatedDoc.id,
      ...data,
      created_at: toDate(data.created_at)?.toISOString(),
      last_seen: toDate(data.last_seen)?.toISOString()
    });
  } catch (error) {
    console.error('Error updating TV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener TV por ID
app.get('/api/tvs/:id', async (req, res) => {
  try {
    // Check main cache first to avoid single read if possible
    const cachedTVs = cache.get('all_tvs');
    if (cachedTVs) {
      const cachedTV = cachedTVs.find(tv => tv.id === req.params.id);
      if (cachedTV) {
        return res.json(cachedTV);
      }
    }

    const doc = await db.collection(COLLECTIONS.TVS).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'TV not found' });
    }

    const data = doc.data();

    // Calcular status basado en last_seen (igual que en /api/tvs)
    const lastSeen = toDate(data.last_seen);
    const now = new Date();
    const minutesSinceLastSeen = lastSeen ? (now - lastSeen) / (1000 * 60) : Infinity;
    const status = minutesSinceLastSeen < 3 ? 'online' : 'offline';

    res.json({
      id: doc.id,
      ...data,
      status, // Sobrescribir status de la DB con el calculado
      created_at: toDate(data.created_at)?.toISOString(),
      last_seen: toDate(data.last_seen)?.toISOString()
    });
  } catch (error) {
    console.error('Error fetching TV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar TV
app.delete('/api/tvs/:id', async (req, res) => {
  cache.clear('all_tvs'); // Invalidate cache
  try {
    await db.collection(COLLECTIONS.TVS).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting TV:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== VIDEO ENDPOINTS ==========

// Crear video o imagen
app.post('/api/videos', async (req, res) => {
  cache.clear('all_videos'); // Invalidate cache
  try {
    const { name, url, duration, type, images, display_mode, interval } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Detectar si la URL ya es de Bunny CDN
    const isBunnyUrl = url.includes('b-cdn.net');

    // Convertir URL a Bunny CDN si está configurado y no es ya Bunny
    let finalUrl = url;
    let bunnyUrl = isBunnyUrl ? url : null;
    let b2Url = url.includes('backblazeb2.com') ? url : null;

    if (!isBunnyUrl && process.env.USE_BUNNY_CDN === 'true' && process.env.BUNNY_CDN_URL) {
      // Si la URL es de B2 o es relativa, convertirla
      if (url.includes('backblazeb2.com') || url.startsWith('/')) {
        finalUrl = convertToBunnyCDN(url);
        bunnyUrl = finalUrl.includes('b-cdn.net') ? finalUrl : null;
        b2Url = url.includes('backblazeb2.com') ? url : null;
        console.log(`[Create Video] URL convertida a Bunny CDN: ${url} -> ${finalUrl}`);
      }
    }

    // Determinar tipo automáticamente si no se especifica
    let contentType = type;
    if (!contentType) {
      const urlLower = finalUrl.toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlLower)) {
        contentType = 'image';
      } else {
        contentType = 'video';
      }
    }

    const videoData = {
      name,
      url: finalUrl, // URL final (Bunny CDN si está configurado, B2 si no)
      bunnyUrl: bunnyUrl, // URL de Bunny CDN explícita
      b2Url: b2Url || url, // URL original de B2
      originalUrl: url, // Guardar URL original para referencia
      type: contentType,
      duration: duration || null,
      images: images || null,
      display_mode: display_mode || null, // 'carousel', 'random', null
      interval: interval || null, // intervalo en ms para carrusel/random
      created_at: toTimestamp(new Date())
    };

    const docRef = await db.collection(COLLECTIONS.VIDEOS).add(videoData);
    res.json({ id: docRef.id, ...videoData });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar video (PATCH)
app.patch('/api/videos/:id', async (req, res) => {
  cache.clear('all_videos'); // Invalidate cache
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`[PATCH /api/videos/:id] Actualizando video ${id} con datos:`, updateData);

    const docRef = db.collection(COLLECTIONS.VIDEOS).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`[PATCH /api/videos/:id] ❌ Video ${id} no encontrado en Firestore`);
      return res.status(404).json({ error: 'Video not found' });
    }

    // Preparar datos de actualización
    const dataToUpdate = {};
    if (updateData.duration !== undefined) {
      dataToUpdate.duration = updateData.duration;
    }
    if (updateData.name !== undefined) {
      dataToUpdate.name = updateData.name;
    }
    if (updateData.url !== undefined) {
      dataToUpdate.url = updateData.url;
    }

    dataToUpdate.updated_at = toTimestamp(new Date());

    await docRef.update(dataToUpdate);

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los videos
app.get('/api/videos', async (req, res) => {
  // Check cache
  const cachedVideos = cache.get('all_videos');
  if (cachedVideos) {
    console.log(`[GET /api/videos] 🟢 Sirviendo ${cachedVideos.length} videos desde memoria`);
    return res.json(cachedVideos);
  }

  try {
    const snapshot = await db.collection(COLLECTIONS.VIDEOS)
      .orderBy('created_at', 'desc')
      .get();

    const videos = snapshot.docs.map(doc => {
      const videoData = doc.data();

      // Convertir URL a Bunny CDN si está configurado y la URL es de B2
      let videoUrl = videoData.url;
      if (process.env.USE_BUNNY_CDN === 'true' && process.env.BUNNY_CDN_URL) {
        // Si la URL es de B2 o es relativa, convertirla
        if (videoUrl && (videoUrl.includes('backblazeb2.com') || videoUrl.startsWith('/'))) {
          // Si es relativa, construir la URL completa de B2 primero
          if (videoUrl.startsWith('/')) {
            videoUrl = `https://s3.us-east-005.backblazeb2.com${videoUrl}`;
          }
          videoUrl = convertToBunnyCDN(videoUrl);
        }
      }

      // Determinar si tiene URL de Bunny CDN
      const hasBunnyUrl = videoUrl && videoUrl.includes('b-cdn.net');
      const bunnyUrl = hasBunnyUrl ? videoUrl : (videoData.bunnyUrl || null);
      const b2Url = videoData.b2Url || videoData.originalUrl || videoData.url;

      return {
        id: doc.id,
        ...videoData,
        url: videoUrl, // URL final (Bunny CDN si está configurado, B2 si no)
        bunnyUrl: bunnyUrl, // URL de Bunny CDN explícita
        b2Url: b2Url, // URL original de B2
        originalUrl: videoData.originalUrl || videoData.url, // URL original para referencia
        duration: videoData.duration || null, // Asegurar que duration esté presente (puede ser 0, null o undefined)
        created_at: toDate(videoData.created_at)?.toISOString()
      };
    });

    // Save to cache (60 seconds)
    if (videos.length > 0) {
      cache.set('all_videos', videos, 60);
    }

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar video
app.delete('/api/videos/:id', async (req, res) => {
  cache.clear('all_videos'); // Invalidate cache
  try {
    await db.collection(COLLECTIONS.VIDEOS).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SCHEDULE ENDPOINTS ==========

// Crear programación
app.post('/api/schedules', async (req, res) => {
  cache.clear('all_schedules'); // Invalidate cache
  try {
    const { tv_id, video_id, start_time, end_time, day_of_week, is_active, days, sequence_order, is_loop } = req.body;

    if (!tv_id || !video_id || !start_time) {
      return res.status(400).json({ error: 'TV ID, Video ID and Start Time are required' });
    }

    // Si se envía un array de días, crear múltiples programaciones
    const daysToSchedule = days && Array.isArray(days) && days.length > 0 ? days :
      (day_of_week !== undefined && day_of_week !== null ? [day_of_week] : [null]);

    const results = [];

    for (const day of daysToSchedule) {
      const scheduleData = {
        tv_id,
        video_id,
        start_time,
        end_time: end_time || null,
        day_of_week: day,
        is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
        sequence_order: sequence_order !== undefined ? sequence_order : null,
        is_loop: is_loop !== undefined ? (is_loop ? 1 : 0) : 0,
        custom_duration: req.body.custom_duration || null,
        created_at: toTimestamp(new Date())
      };

      const docRef = await db.collection(COLLECTIONS.SCHEDULES).add(scheduleData);
      results.push({ id: docRef.id, ...scheduleData });
    }

    // 🗑️ Limpiar caché del TV afectado para forzar actualización
    const tvDoc = await db.collection(COLLECTIONS.TVS).doc(tv_id).get();
    if (tvDoc.exists) {
      const tvData = tvDoc.data();
      if (tvData.device_id) {
        cache.clear(`playback_${tvData.device_id}`);
        console.log(`[Cache] Limpiado caché para TV ${tvData.device_id} después de crear programación`);
      }
    }

    // Si solo hay una programación, devolver el objeto directamente
    if (results.length === 1) {
      res.json(results[0]);
    } else {
      res.json({ success: true, count: results.length, schedules: results });
    }
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener programación de una TV
app.get('/api/schedules/tv/:tv_id', async (req, res) => {
  try {
    const { tv_id } = req.params;

    // Obtener TV por ID o device_id
    let tvDoc;
    try {
      tvDoc = await db.collection(COLLECTIONS.TVS).doc(tv_id).get();
    } catch (e) {
      // Si no es un ID válido, buscar por device_id
      const tvSnapshot = await db.collection(COLLECTIONS.TVS)
        .where('device_id', '==', tv_id)
        .limit(1)
        .get();
      if (!tvSnapshot.empty) {
        tvDoc = tvSnapshot.docs[0];
      }
    }

    if (!tvDoc || !tvDoc.exists) {
      return res.status(404).json({ error: 'TV not found' });
    }

    const actualTvId = tvDoc.id;
    const schedulesSnapshot = await db.collection(COLLECTIONS.SCHEDULES)
      .where('tv_id', '==', actualTvId)
      .where('is_active', '==', 1)
      .get();

    const schedules = await Promise.all(schedulesSnapshot.docs.map(async (doc) => {
      const scheduleData = doc.data();
      const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(scheduleData.video_id).get();
      const videoData = videoDoc.exists ? videoDoc.data() : null;

      return {
        id: doc.id,
        ...scheduleData,
        video_name: videoData?.name,
        video_url: videoData?.url,
        created_at: toDate(scheduleData.created_at)?.toISOString()
      };
    }));

    schedules.sort((a, b) => a.start_time.localeCompare(b.start_time));
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las programaciones
app.get('/api/schedules', async (req, res) => {
  // Check cache
  const cachedSchedules = cache.get('all_schedules');
  if (cachedSchedules) {
    console.log(`[GET /api/schedules] 🟢 Sirviendo ${cachedSchedules.length} programaciones desde memoria`);
    return res.json(cachedSchedules);
  }

  try {
    const schedulesSnapshot = await db.collection(COLLECTIONS.SCHEDULES)
      .orderBy('created_at', 'desc')
      .get();

    const schedules = await Promise.all(schedulesSnapshot.docs.map(async (doc) => {
      const scheduleData = doc.data();

      // OPTIMIZATION: In a real world scenario, fetching TVs and Videos N times is bad.
      // But for now, we rely on the main cache to avoid hitting this code path too often.
      const [tvDoc, videoDoc] = await Promise.all([
        db.collection(COLLECTIONS.TVS).doc(scheduleData.tv_id).get(),
        db.collection(COLLECTIONS.VIDEOS).doc(scheduleData.video_id).get()
      ]);

      return {
        id: doc.id,
        ...scheduleData,
        tv_name: tvDoc.exists ? tvDoc.data().name : null,
        video_name: videoDoc.exists ? videoDoc.data().name : null,
        video_url: videoDoc.exists ? videoDoc.data().url : null,
        created_at: toDate(scheduleData.created_at)?.toISOString()
      };
    }));

    // Cache results (60 seconds)
    if (schedules.length > 0) {
      cache.set('all_schedules', schedules, 60);
    }

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar programación
app.delete('/api/schedules/:id', async (req, res) => {
  cache.clear('all_schedules'); // Invalidate cache
  try {
    // Obtener la programación antes de eliminarla para limpiar el caché del TV
    const scheduleDoc = await db.collection(COLLECTIONS.SCHEDULES).doc(req.params.id).get();

    if (scheduleDoc.exists) {
      const scheduleData = scheduleDoc.data();
      const tvDoc = await db.collection(COLLECTIONS.TVS).doc(scheduleData.tv_id).get();

      if (tvDoc.exists) {
        const tvData = tvDoc.data();
        if (tvData.device_id) {
          cache.clear(`playback_${tvData.device_id}`);
          console.log(`[Cache] Limpiado caché para TV ${tvData.device_id} después de eliminar programación`);
        }
      }
    }

    await db.collection(COLLECTIONS.SCHEDULES).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== PLAYLIST ENDPOINTS ==========

// Crear playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const { name, items, tv_id } = req.body;

    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Name and items array are required' });
    }

    const playlistData = {
      name,
      items, // Array de { video_id, duration (en segundos), order }
      tv_id: tv_id || null,
      created_at: toTimestamp(new Date()),
      updated_at: toTimestamp(new Date())
    };

    const docRef = await db.collection(COLLECTIONS.PLAYLISTS).add(playlistData);

    // Limpiar caché si está asociado a un TV
    if (tv_id) {
      const tvDoc = await db.collection(COLLECTIONS.TVS).doc(tv_id).get();
      if (tvDoc.exists) {
        const tvData = tvDoc.data();
        if (tvData.device_id) {
          cache.clear(`playback_${tvData.device_id}`);
          console.log(`[Cache] Limpiado caché para TV ${tvData.device_id} después de crear playlist`);
        }
      }
    }

    res.json({ id: docRef.id, ...playlistData });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.PLAYLISTS)
      .orderBy('created_at', 'desc')
      .get();

    const playlists = await Promise.all(snapshot.docs.map(async (doc) => {
      const playlistData = doc.data();

      // Obtener información de los videos
      const itemsWithVideoData = await Promise.all(
        (playlistData.items || []).map(async (item) => {
          const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(item.video_id).get();
          const videoData = videoDoc.exists ? videoDoc.data() : null;

          return {
            ...item,
            video_name: videoData?.name,
            video_url: videoData?.url,
            video_type: videoData?.type
          };
        })
      );

      return {
        id: doc.id,
        ...playlistData,
        items: itemsWithVideoData,
        created_at: toDate(playlistData.created_at)?.toISOString(),
        updated_at: toDate(playlistData.updated_at)?.toISOString()
      };
    }));

    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener playlist por ID
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.PLAYLISTS).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlistData = doc.data();

    // Obtener información de los videos
    const itemsWithVideoData = await Promise.all(
      (playlistData.items || []).map(async (item) => {
        const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(item.video_id).get();
        const videoData = videoDoc.exists ? videoDoc.data() : null;

        return {
          ...item,
          video_name: videoData?.name,
          video_url: videoData?.url,
          video_type: videoData?.type
        };
      })
    );

    res.json({
      id: doc.id,
      ...playlistData,
      items: itemsWithVideoData,
      created_at: toDate(playlistData.created_at)?.toISOString(),
      updated_at: toDate(playlistData.updated_at)?.toISOString()
    });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar playlist
app.patch('/api/playlists/:id', async (req, res) => {
  try {
    const { name, items, tv_id } = req.body;
    const docRef = db.collection(COLLECTIONS.PLAYLISTS).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const updateData = {
      updated_at: toTimestamp(new Date())
    };

    if (name !== undefined) updateData.name = name;
    if (items !== undefined) updateData.items = items;
    if (tv_id !== undefined) updateData.tv_id = tv_id;

    await docRef.update(updateData);

    // Limpiar caché si está asociado a un TV
    const updatedDoc = await docRef.get();
    const playlistData = updatedDoc.data();
    if (playlistData.tv_id) {
      const tvDoc = await db.collection(COLLECTIONS.TVS).doc(playlistData.tv_id).get();
      if (tvDoc.exists) {
        const tvData = tvDoc.data();
        if (tvData.device_id) {
          cache.clear(`playback_${tvData.device_id}`);
          console.log(`[Cache] Limpiado caché para TV ${tvData.device_id} después de actualizar playlist`);
        }
      }
    }

    res.json({
      id: updatedDoc.id,
      ...playlistData,
      created_at: toDate(playlistData.created_at)?.toISOString(),
      updated_at: toDate(playlistData.updated_at)?.toISOString()
    });
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar playlist
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const playlistDoc = await db.collection(COLLECTIONS.PLAYLISTS).doc(req.params.id).get();

    if (playlistDoc.exists) {
      const playlistData = playlistDoc.data();
      if (playlistData.tv_id) {
        const tvDoc = await db.collection(COLLECTIONS.TVS).doc(playlistData.tv_id).get();
        if (tvDoc.exists) {
          const tvData = tvDoc.data();
          if (tvData.device_id) {
            cache.clear(`playback_${tvData.device_id}`);
            console.log(`[Cache] Limpiado caché para TV ${tvData.device_id} después de eliminar playlist`);
          }
        }
      }
    }

    await db.collection(COLLECTIONS.PLAYLISTS).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CLIENT ENDPOINTS ==========

// Obtener versión actual del APK (para sistema de actualización)
app.get('/api/client/version', async (req, res) => {
  try {
    // Leer el archivo version.json del cliente
    const versionPath = path.join(__dirname, '../cliente/www/version.json');

    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      res.json(versionData);
    } else {
      // Si no existe el archivo, devolver versión por defecto
      res.json({
        version: '1.0.0',
        buildNumber: 1,
        buildDate: new Date().toISOString(),
        downloadUrl: 'https://drive.google.com/uc?export=download&id=1-joJv2LvPmZ97ltgRIxPGd7bXFYRNPMN',
        releaseNotes: 'Versión inicial'
      });
    }
  } catch (error) {
    console.error('Error obteniendo versión:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener programación actual para un TV (usado por el cliente)
app.get('/api/client/playback/:device_id', async (req, res) => {
  // Timeout de 5 segundos
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.json({ content: null });
    }
  }, 5000);

  try {
    const { device_id } = req.params;

    // 🚀 VERIFICAR CACHÉ PRIMERO - Reducir lecturas de Firestore
    const cacheKey = `playback_${device_id}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      clearTimeout(timeout);
      console.log(`[Playback Cache] ✅ Devolviendo desde caché para ${device_id}`);
      return res.json(cachedResult);
    }

    // Use America/New_York (Service is in NJ area)
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'); // HH:MM
    const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado

    // Buscar TV por device_id
    const tvSnapshot = await Promise.race([
      db.collection(COLLECTIONS.TVS)
        .where('device_id', '==', device_id)
        .limit(1)
        .get()
        .catch(err => {
          console.error('Error obteniendo TV:', err);
          return { empty: true, docs: [] };
        }),
      new Promise((resolve) => setTimeout(() => resolve({ empty: true, docs: [] }), 3000))
    ]);

    if (tvSnapshot.empty) {
      clearTimeout(timeout);
      return res.json({ content: null });
    }

    const tvDoc = tvSnapshot.docs[0];
    const tvId = tvDoc.id;
    const tvData = tvDoc.data();

    // ⚡ Actualizar last_seen SIEMPRE en cada petición para máxima precisión
    // Al ser pocos TVs, la prioridad es la precisión del estado "En Linea"
    await Promise.race([
      tvDoc.ref.update({
        status: 'online',
        last_seen: toTimestamp(new Date())
      }).catch(err => console.error('Error actualizando TV:', err)),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);
    console.log(`[Playback] 📝 Actualizado last_seen para TV ${device_id} (Sync inmediato)`);

    // Buscar programaciones activas para esta TV
    const schedulesSnapshot = await Promise.race([
      db.collection(COLLECTIONS.SCHEDULES)
        .where('tv_id', '==', tvId)
        .where('is_active', '==', 1)
        .get()
        .catch(err => {
          console.error('Error obteniendo schedules:', err);
          return { docs: [] };
        }),
      new Promise((resolve) => setTimeout(() => resolve({ docs: [] }), 2000))
    ]);

    // Filtrar programaciones válidas para el momento actual
    const validSchedules = [];

    console.log(`[Playback] Device: ${device_id}, Current time: ${currentTime}, Day of week: ${dayOfWeek}`);

    for (const doc of schedulesSnapshot.docs) {
      const schedule = doc.data();

      console.log(`[Playback] Checking schedule:`, {
        id: doc.id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        day_of_week: schedule.day_of_week,
        is_active: schedule.is_active
      });

      // Verificar día de la semana
      if (schedule.day_of_week !== null && schedule.day_of_week !== dayOfWeek) {
        console.log(`[Playback] Schedule ${doc.id} skipped: day mismatch (${schedule.day_of_week} !== ${dayOfWeek})`);
        continue;
      }

      // Normalizar formato de hora (asegurar formato HH:MM con ceros a la izquierda)
      const normalizeTime = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.split(':');
        if (parts.length === 2) {
          const hours = parts[0].padStart(2, '0');
          const minutes = parts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        return timeStr;
      };

      const normalizedStartTime = normalizeTime(schedule.start_time);
      const normalizedEndTime = normalizeTime(schedule.end_time);
      const normalizedCurrentTime = normalizeTime(currentTime);

      // Verificar horario
      if (normalizedStartTime && normalizedStartTime <= normalizedCurrentTime) {
        if (!normalizedEndTime || normalizedEndTime >= normalizedCurrentTime) {
          console.log(`[Playback] Schedule ${doc.id} is VALID`);
          validSchedules.push({ id: doc.id, ...schedule });
        } else {
          console.log(`[Playback] Schedule ${doc.id} skipped: end time passed (${normalizedEndTime} < ${normalizedCurrentTime})`);
        }
      } else {
        console.log(`[Playback] Schedule ${doc.id} skipped: start time not reached (${normalizedStartTime} > ${normalizedCurrentTime})`);
      }
    }

    console.log(`[Playback] Found ${validSchedules.length} valid schedules`);

    if (validSchedules.length === 0) {
      console.log(`[Playback] No valid schedules found. Current time: ${currentTime}, Day: ${dayOfWeek}`);
      console.log(`[Playback] Total schedules checked: ${schedulesSnapshot.docs.length}`);
    }

    if (validSchedules.length > 0) {
      // Ordenar por prioridad: programaciones inmediatas primero, luego por sequence_order, luego por start_time
      validSchedules.sort((a, b) => {
        // Prioridad 1: Programaciones inmediatas (is_immediate === 1)
        const aIsImmediate = a.is_immediate === 1;
        const bIsImmediate = b.is_immediate === 1;
        if (aIsImmediate && !bIsImmediate) return -1;
        if (!aIsImmediate && bIsImmediate) return 1;

        // Prioridad 2: Por campo priority (mayor = más prioridad)
        if (a.priority && b.priority) {
          return b.priority - a.priority; // Mayor prioridad primero
        }
        if (a.priority) return -1;
        if (b.priority) return 1;

        // Prioridad 3: Por sequence_order si existe
        if (a.sequence_order !== null && b.sequence_order !== null) {
          return a.sequence_order - b.sequence_order;
        }
        if (a.sequence_order !== null) return -1;
        if (b.sequence_order !== null) return 1;

        // Prioridad 4: Por start_time (más reciente primero para programaciones inmediatas)
        if (aIsImmediate && bIsImmediate) {
          return b.start_time.localeCompare(a.start_time); // Más reciente primero
        }
        return a.start_time.localeCompare(b.start_time);
      });

      console.log(`[Playback] Schedules ordenados. Primera programación:`, {
        id: validSchedules[0].id,
        video_id: validSchedules[0].video_id,
        is_immediate: validSchedules[0].is_immediate,
        priority: validSchedules[0].priority,
        start_time: validSchedules[0].start_time
      });

      // Si hay secuencia (con o sin loop), obtener todos los videos de la secuencia
      const firstSchedule = validSchedules[0];
      // Detectar secuencia: si tiene sequence_order, es parte de una secuencia
      const isSequence = firstSchedule.sequence_order !== null;

      if (isSequence) {
        // Obtener todos los videos de la secuencia (con o sin loop)
        // Buscar TODAS las programaciones con sequence_order de la misma TV y mismo start_time
        // para agruparlas en una sola secuencia
        const sequenceStartTime = firstSchedule.start_time;
        const sequenceSchedules = schedulesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(s =>
            s.sequence_order !== null &&
            s.tv_id === tvId &&
            s.start_time === sequenceStartTime &&
            s.is_active === 1
          );
        sequenceSchedules.sort((a, b) => a.sequence_order - b.sequence_order);

        console.log(`[Playback] Secuencia detectada: ${sequenceSchedules.length} videos con start_time ${sequenceStartTime}`);

        const sequenceVideos = await Promise.all(
          sequenceSchedules.map(async (schedule) => {
            const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(schedule.video_id).get();
            if (videoDoc.exists) {
              return {
                id: videoDoc.id,
                ...videoDoc.data(),
                id: videoDoc.id,
                ...videoDoc.data(),
                schedule_id: schedule.id,
                custom_duration: schedule.custom_duration // Propagar duración personalizada
              };
            }
            return null;
          })
        );

        const validVideos = sequenceVideos.filter(v => v !== null);

        if (validVideos.length > 0) {
          // Actualizar reproducción actual
          const playbackRef = db.collection(COLLECTIONS.CURRENT_PLAYBACK).doc(tvId);
          await playbackRef.set({
            tv_id: tvId,
            video_id: validVideos[0].id,
            started_at: toTimestamp(new Date()),
            sequence: validVideos.map(v => ({ id: v.id, url: v.url, name: v.name, duration: v.duration }))
          }, { merge: true });

          // Convertir URLs a Bunny CDN si está configurado
          const videosWithCDN = validVideos.map(v => {
            let videoUrl = v.url;
            if (process.env.USE_BUNNY_CDN === 'true' && process.env.BUNNY_CDN_URL) {
              videoUrl = convertToBunnyCDN(v.url);
            }
            return {
              url: videoUrl,
              name: v.name,
              duration: v.custom_duration || v.duration, // Usar duración personalizada si existe
              type: v.type || 'video'
            };
          });

          const responseData = {
            content: {
              type: 'sequence',
              videos: videosWithCDN,
              loop: firstSchedule.is_loop === 1 // Usar el valor real de is_loop
            },
            schedule: {
              start_time: firstSchedule.start_time,
              end_time: firstSchedule.end_time
            }
          };

          // 💾 Guardar en caché por 3 minutos (180s) para coincidir con el intervalo de sincronización del cliente
          cache.set(cacheKey, responseData, 180);

          clearTimeout(timeout);
          res.json(responseData);
          return;
        }
      }

      // Programación normal (un solo video)
      const activeSchedule = validSchedules[0];
      const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(activeSchedule.video_id).get();

      if (videoDoc.exists) {
        const videoData = videoDoc.data();

        // Actualizar reproducción actual
        const playbackRef = db.collection(COLLECTIONS.CURRENT_PLAYBACK).doc(tvId);
        await playbackRef.set({
          tv_id: tvId,
          video_id: activeSchedule.video_id,
          started_at: toTimestamp(new Date())
        }, { merge: true });

        // Determinar tipo de contenido basado en la extensión o tipo explícito
        const url = videoData.url.toLowerCase();
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
        const contentType = videoData.type || (isImage ? 'image' : 'video');

        // Preparar respuesta según el tipo
        // Convertir URL a Bunny CDN si está configurado
        let videoUrl = videoData.url;
        console.log(`[Playback] Video URL original: ${videoUrl}`);
        console.log(`[Playback] USE_BUNNY_CDN: ${process.env.USE_BUNNY_CDN}`);
        console.log(`[Playback] BUNNY_CDN_URL: ${process.env.BUNNY_CDN_URL}`);

        if (process.env.USE_BUNNY_CDN === 'true' && process.env.BUNNY_CDN_URL) {
          const originalUrl = videoUrl;
          videoUrl = convertToBunnyCDN(videoData.url);
          console.log(`[Playback] URL convertida: ${originalUrl} -> ${videoUrl}`);
        } else {
          console.log(`[Playback] Bunny CDN no configurado, usando URL original`);
        }

        let content = {
          url: videoUrl,
          name: videoData.name,
          type: contentType,
          loop: activeSchedule.is_loop === 1 // Incluir loop para videos individuales también
        };

        // Si es imagen, agregar duración si existe
        if (contentType === 'image') {
          // Usar duración personalizada de la programación si existe, sino la del video
          if (activeSchedule.custom_duration) {
            content.duration = parseInt(activeSchedule.custom_duration);
          } else if (videoData.duration) {
            content.duration = videoData.duration;
          }
        }

        // Si hay imágenes adicionales (para carrusel o random)
        if (videoData.images && Array.isArray(videoData.images) && videoData.images.length > 0) {
          if (videoData.display_mode === 'carousel') {
            content.type = 'carousel';
            content.images = videoData.images.map(img => {
              let imgUrl = typeof img === 'string' ? img : img.url;
              if (process.env.USE_BUNNY_CDN === 'true' && process.env.BUNNY_CDN_URL) {
                imgUrl = convertToBunnyCDN(imgUrl);
              }
              return {
                url: imgUrl,
                name: videoData.name
              };
            });
            content.interval = videoData.interval || 5000;
          } else if (videoData.display_mode === 'random') {
            content.type = 'random';
            content.images = videoData.images.map(img => {
              let imgUrl = typeof img === 'string' ? img : img.url;
              if (process.env.USE_BUNNY_CDN === 'true' && process.env.BUNNY_CDN_URL) {
                imgUrl = convertToBunnyCDN(imgUrl);
              }
              return {
                url: imgUrl,
                name: videoData.name
              };
            });
            content.interval = videoData.interval || 10000;
          }
        }

        console.log(`[Playback] ✅ Sending content to client:`, {
          type: content.type,
          url: content.url,
          name: content.name,
          video_id: activeSchedule.video_id,
          schedule_id: activeSchedule.id,
          is_immediate: activeSchedule.is_immediate
        });

        const responseData = {
          content: content,
          schedule: {
            start_time: activeSchedule.start_time,
            end_time: activeSchedule.end_time
          }
        };

        // 💾 Guardar en caché por 3 minutos (180s) para coincidir con el intervalo de sincronización del cliente
        cache.set(cacheKey, responseData, 180);

        clearTimeout(timeout);
        res.json(responseData);
      } else {
        clearTimeout(timeout);
        res.json({ content: null });
      }
    } else {
      const responseData = { content: null };

      // 💾 Guardar en caché por 3 minutos (180s) - incluso cuando no hay contenido, para evitar consultas repetidas
      cache.set(cacheKey, responseData, 180);

      clearTimeout(timeout);
      res.json(responseData);
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error fetching playback:', error);
    if (!res.headersSent) {
      res.json({ content: null });
    }
  }
});

// Forzar reproducción de video en un TV
app.post('/api/client/play/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;
    const { video_id } = req.body;

    // Buscar TV
    const tvSnapshot = await db.collection(COLLECTIONS.TVS)
      .where('device_id', '==', device_id)
      .limit(1)
      .get();

    if (tvSnapshot.empty) {
      return res.status(404).json({ error: 'TV not found' });
    }

    const tvDoc = tvSnapshot.docs[0];
    const tvId = tvDoc.id;

    // Verificar video
    const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(video_id).get();

    if (!videoDoc.exists) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoData = videoDoc.data();
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    // Desactivar temporalmente otras programaciones activas para esta TV
    // para que la reproducción inmediata tenga prioridad
    const activeSchedulesSnapshot = await db.collection(COLLECTIONS.SCHEDULES)
      .where('tv_id', '==', tvId)
      .where('is_active', '==', 1)
      .get();

    // Desactivar otras programaciones (se reactivarán después de un tiempo o manualmente)
    const batch = db.batch();
    activeSchedulesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_active: 0, paused_until: toTimestamp(new Date(Date.now() + 3600000)) }); // Pausar por 1 hora
    });
    await batch.commit();

    // Crear programación inmediata con prioridad alta
    const scheduleData = {
      tv_id: tvId,
      video_id,
      start_time: currentTime,
      end_time: null,
      day_of_week: null,
      is_active: 1,
      is_immediate: 1, // Marcar como programación inmediata
      priority: 999, // Prioridad muy alta
      created_at: toTimestamp(new Date())
    };

    const newScheduleRef = await db.collection(COLLECTIONS.SCHEDULES).add(scheduleData);
    console.log(`[Play Now] Programación inmediata creada: ${newScheduleRef.id} para video ${video_id}`);

    // Notificar al TV inmediatamente para que actualice su contenido
    io.to(`tv-${device_id}`).emit('content-update');
    console.log(`[Play Now] Señal enviada a TV: ${device_id}`);

    res.json({ success: true, video: { id: videoDoc.id, ...videoData }, schedule_id: newScheduleRef.id });
  } catch (error) {
    console.error('Error playing video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Detener reproducción en un TV
app.post('/api/client/stop/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;

    // Buscar TV
    const tvSnapshot = await db.collection(COLLECTIONS.TVS)
      .where('device_id', '==', device_id)
      .limit(1)
      .get();

    if (tvSnapshot.empty) {
      return res.status(404).json({ error: 'TV not found' });
    }

    const tvDoc = tvSnapshot.docs[0];
    const tvId = tvDoc.id;

    // Desactivar programaciones activas e INMEDIATAS
    const batch = db.batch();

    // Obtener todas las programaciones activas (incluyendo inmediatas)
    const activeSchedulesSnapshot = await db.collection(COLLECTIONS.SCHEDULES)
      .where('tv_id', '==', tvId)
      .where('is_active', '==', 1)
      .get();

    activeSchedulesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        is_active: 0,
        stopped_at: toTimestamp(new Date())
      });
    });

    await batch.commit();

    // Enviar señal WebSocket para detener reproducción inmediatamente
    io.to(`tv-${device_id}`).emit('stop-playback', {
      timestamp: Date.now()
    });

    console.log(`[Stop] Enviando señal de stop a TV: ${device_id}`);

    res.json({ success: true, message: 'Reproducción detenida' });
  } catch (error) {
    console.error('Error stopping playback:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== B2 UPLOAD ENDPOINTS ==========

// Subir video a B2
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const { name, folder } = req.body;
    const file = req.file;

    // Generar nombre único si no se proporciona
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = name
      ? `${name.replace(/[^a-zA-Z0-9.-]/g, '_')}_${timestamp}.${originalName.split('.').pop()}`
      : `${timestamp}_${originalName}`;

    // Subir a B2
    const uploadResult = await uploadFile(
      file.buffer,
      fileName,
      file.mimetype,
      folder || 'videos'
    );

    console.log('[Upload] Resultado de subida:', {
      url: uploadResult.url,
      b2Url: uploadResult.b2Url,
      cdnUrl: uploadResult.cdnUrl,
      isBunnyCDN: uploadResult.url && uploadResult.url.includes('b-cdn.net')
    });

    res.json({
      success: true,
      url: uploadResult.url, // URL final (Bunny CDN si está configurado, B2 si no)
      b2Url: uploadResult.b2Url || uploadResult.url, // URL original de B2
      cdnUrl: uploadResult.cdnUrl || (uploadResult.url && uploadResult.url.includes('b-cdn.net') ? uploadResult.url : null),
      key: uploadResult.key,
      name: fileName,
      size: uploadResult.size,
      message: uploadResult.url && uploadResult.url.includes('b-cdn.net')
        ? 'Video subido exitosamente a B2 y servido desde Bunny CDN'
        : 'Video subido exitosamente a B2'
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar archivos en B2
app.get('/api/b2/files', async (req, res) => {
  try {
    const { folder } = req.query;
    const files = await listFiles(folder || '');
    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar archivo de B2
app.delete('/api/b2/files/:key', async (req, res) => {
  try {
    const { key } = req.params;
    // Decodificar la key (puede venir codificada)
    const decodedKey = decodeURIComponent(key);
    await deleteFile(decodedKey);
    res.json({ success: true, message: 'Archivo eliminado de B2' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Servir admin en todas las rutas no-API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const adminPath = path.join(__dirname, '../admin/dist/index.html');
    const fs = require('fs');
    if (fs.existsSync(adminPath)) {
      res.sendFile(adminPath);
    } else {
      res.status(404).send(`
        <html>
          <head><title>Admin Panel</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>Admin Panel no disponible</h1>
            <p>El panel de administración no ha sido compilado.</p>
            <p>Ejecuta: <code>npm run build</code> para compilar el admin.</p>
            <p>API disponible en: <a href="/api/health">/api/health</a></p>
          </body>
        </html>
      `);
    }
  }
});

// Almacenar estado de reproducción de cada TV
const tvPlaybackState = new Map(); // device_id -> { currentTime, videoUrl, videoName, duration, isPlaying, etc. }

// Configurar Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Cuando un TV se conecta y envía su device_id
  socket.on('tv-register', (data) => {
    const { device_id } = data;
    if (device_id) {
      socket.device_id = device_id;
      socket.join(`tv-${device_id}`);
      console.log(`📺 TV registrado vía WebSocket: ${device_id}`);

      // Enviar estado actual si existe
      if (tvPlaybackState.has(device_id)) {
        socket.emit('playback-state', tvPlaybackState.get(device_id));
      }
    }
  });

  // Cuando un TV actualiza su estado de reproducción
  socket.on('playback-update', (data) => {
    const { device_id, currentTime, videoUrl, videoName, duration, isPlaying, videoIndex, totalVideos, sequenceLoop } = data;

    if (device_id) {
      const state = {
        device_id,
        currentTime: currentTime || 0,
        videoUrl,
        videoName,
        duration: duration || 0,
        isPlaying: isPlaying || false,
        videoIndex: videoIndex || 0,
        totalVideos: totalVideos || 1,
        sequenceLoop: sequenceLoop || false,
        timestamp: Date.now()
      };

      // Guardar estado
      tvPlaybackState.set(device_id, state);

      // Broadcast a todos los admins conectados
      io.to('admins').emit('tv-playback-update', state);

      console.log(`📊 Estado actualizado para TV ${device_id}:`, {
        video: videoName,
        time: `${Math.floor(currentTime)}s / ${Math.floor(duration)}s`,
        playing: isPlaying
      });
    }
  });

  // Cuando un admin se conecta
  socket.on('admin-connect', () => {
    socket.join('admins');
    console.log('👤 Admin conectado:', socket.id);

    // Enviar todos los estados actuales guardados
    const allStates = Array.from(tvPlaybackState.entries()).map(([device_id, state]) => ({
      device_id,
      ...state
    }));
    socket.emit('all-playback-states', allStates);

    // Solicitar estado actual a todos los TVs conectados
    io.emit('request-playback-state');
  });

  // Cuando un admin solicita el estado de todos los TVs
  socket.on('request-all-playback-states', () => {
    if (socket.rooms.has('admins')) {
      // Enviar estados guardados
      const allStates = Array.from(tvPlaybackState.entries()).map(([device_id, state]) => ({
        device_id,
        ...state
      }));
      socket.emit('all-playback-states', allStates);

      // Solicitar estado actual a todos los TVs
      io.emit('request-playback-state');
    }
  });

  // Cuando un TV se desconecta
  socket.on('disconnect', async () => {
    console.log('🔌 Cliente desconectado:', socket.id);
    if (socket.device_id) {
      console.log(`❌ TV desconectado: ${socket.device_id}`);

      // Actualizar Firestore inmediatamente
      try {
        const snapshot = await db.collection(COLLECTIONS.TVS)
          .where('device_id', '==', socket.device_id)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            status: 'offline',
            last_seen: toTimestamp(new Date())
          });
          console.log(`[Status] TV ${socket.device_id} marcado como offline`);
        }
      } catch (e) {
        console.error('Error updating offline status:', e);
      }

      // Notificar al admin vía WebSocket
      // Enviamos un evento especial o actualizamos el playState
      io.to('admins').emit('tv-status-change', {
        device_id: socket.device_id,
        status: 'offline'
      });

      if (tvPlaybackState.has(socket.device_id)) {
        const state = tvPlaybackState.get(socket.device_id);
        state.isPlaying = false;
        state.isOffline = true;
        io.to('admins').emit('tv-playback-update', state);
      }
    }
  });
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Admin panel: http://localhost:${PORT}`);
  console.log(`📺 Cliente TV: http://localhost:${PORT}/client`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🔥 Using Firebase Firestore`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Allowed Origins: ${process.env.ALLOWED_ORIGINS || 'default'}`);
  console.log(`🔑 Firebase Service Account: ${process.env.FIREBASE_SERVICE_ACCOUNT ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`📁 Firebase DB: ${db ? '✅ Inicializado' : '❌ No inicializado'}`);
});
