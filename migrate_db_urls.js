const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Setup Firebase manually using the file we know exists
const serviceAccountPath = path.join(__dirname, 'public/prontotv-f3c3b-firebase-adminsdk-fbsvc-409fba3e54.json');
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.error("No se encontró el archivo de credenciales en:", serviceAccountPath);
    console.log("Intentando leer de variable de entorno manual...");
    // Fallback logic if needed, but the file shows it exists in Option 2 of firebase.js
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const CLN_VIDEOS = 'videos';

async function migrateUrls() {
    console.log('🔄 Iniciando migración de URLs de video...');

    try {
        const snapshot = await db.collection(CLN_VIDEOS).get();

        if (snapshot.empty) {
            console.log('No se encontraron videos.');
            return;
        }

        let updatedCount = 0;
        const batch = db.batch();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            let needsUpdate = false;
            const updates = {};
            const oldDomain = 'prontotv-cdn.b-cdn.net';
            const newDomain = 'prontotv2.b-cdn.net';

            // Check URL
            if (data.url && data.url.includes(oldDomain)) {
                updates.url = data.url.replace(oldDomain, newDomain);
                needsUpdate = true;
            }

            // Check BunnyUrl
            if (data.bunnyUrl && data.bunnyUrl.includes(oldDomain)) {
                updates.bunnyUrl = data.bunnyUrl.replace(oldDomain, newDomain);
                needsUpdate = true;
            }

            if (needsUpdate) {
                const docRef = db.collection(CLN_VIDEOS).doc(doc.id);
                batch.update(docRef, updates);
                console.log(`📝 Preparando actualización para video: ${data.name || doc.id}`);
                console.log(`   OLD: ${data.url}`);
                console.log(`   NEW: ${updates.url || data.url}`);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`\n✅ ÉXITO: Se actualizaron ${updatedCount} videos en la base de datos.`);
        } else {
            console.log('\n✅ Todo está limpio. No se encontraron URLs viejas que necesiten actualización.');
        }

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    }
}

migrateUrls();
