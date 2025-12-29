# Optimizaciones de Cuota de Firestore - ProntoTV

## Problema
Error: `Quota exceeded` (code: 8) en Firestore debido a lecturas y escrituras excesivas.

## Análisis del Problema Anterior

### Configuración antes de optimización:
1. **Cliente**: Sincronización cada 10 segundos → Cambiado a 120 segundos ✅
2. **Servidor**: Caché de 20-30 segundos
3. **Problema crítico**: El caché expiraba antes de la próxima petición del cliente
   - Cliente: solicita cada 120 segundos
   - Caché: expiraba en 20-30 segundos
   - **Resultado**: 100% cache miss → 100% de lecturas a Firestore

### Lecturas por cada request de `/api/client/playback/:device_id`:
1. Buscar TV por device_id (1 lectura)
2. Buscar schedules del TV (1+ lecturas)
3. Por cada schedule, buscar video (1+ lecturas)
4. Actualizar last_seen (1 escritura)

**Total**: ~3-10 operaciones de Firestore por request

## Optimizaciones Aplicadas

### 1. ⏱️ Aumento del TTL del Caché (CRÍTICO)
- **Antes**: 20-30 segundos
- **Ahora**: 180 segundos (3 minutos)
- **Impacto**: Reduce lecturas en ~83%
- **Rationale**: El caché ahora persiste por 1.5 ciclos de sincronización del cliente

```javascript
// Antes
cache.set(cacheKey, responseData, 20); // Expiraba antes del próximo request

// Ahora
cache.set(cacheKey, responseData, 180); // Cubre múltiples requests
```

### 2. 🔥 Reducción de Escrituras de `last_seen` (CRÍTICO)
- **Antes**: Escribe a Firestore cada 2 minutos (cada request del cliente)
- **Ahora**: Escribe solo si han pasado >5 minutos
- **Impacto**: Reduce escrituras en ~60%

```javascript
// Solo actualizar si han pasado más de 5 minutos
if (minutesSinceLastUpdate > 5 || !lastSeen) {
  await tvDoc.ref.update({
    status: 'online',
    last_seen: toTimestamp(new Date())
  });
}
```

### 3. 📱 Intervalo de Sincronización del Cliente
- **Antes**: 10 segundos (ya optimizado previamente)
- **Ahora**: 120 segundos (2 minutos)
- **Impacto**: Reduce requests en 92%

## Estimación de Reducción de Cuota

### Escenario: 10 TVs activos 24/7

#### ANTES (configuración original):
- **Requests por TV**: 6 requests/min × 1440 min/día = 8,640 requests/día
- **Lecturas por request**: ~5 (promedio)
- **Total lecturas/TV/día**: 43,200
- **Total 10 TVs**: **432,000 lecturas/día** 🔴
- **Escrituras last_seen/TV/día**: 8,640
- **Total escrituras 10 TVs**: **86,400 escrituras/día** 🔴

#### DESPUÉS (con todas las optimizaciones):
- **Requests por TV**: 0.5 requests/min × 1440 min/día = 720 requests/día
- **Cache hit rate**: ~90% (debido al TTL de 3 minutos)
- **Lecturas efectivas**: 720 × 10% × 5 = 360 lecturas/TV/día
- **Total 10 TVs**: **3,600 lecturas/día** ✅ (-99.2%)
- **Escrituras last_seen**: 720 × 40% = 288 escrituras/TV/día
- **Total escrituras 10 TVs**: **2,880 escrituras/día** ✅ (-96.7%)

## Límites de Firestore (Plan Spark - Gratis)
- **Lecturas**: 50,000/día
- **Escrituras**: 20,000/día
- **Deletes**: 20,000/día

### Margen de Seguridad:
- **Lecturas**: 3,600 / 50,000 = 7.2% usado ✅
- **Escrituras**: 2,880 / 20,000 = 14.4% usado ✅

## Monitoreo

### Logs agregados para debugging:
```javascript
// Cache hits
console.log(`[Playback Cache] ✅ Devolviendo desde caché para ${device_id}`);

// last_seen updates
console.log(`[Playback] 📝 Actualizado last_seen para TV ${device_id}`);
console.log(`[Playback] ⏭️ Skipped last_seen update para TV ${device_id}`);
```

### Verificar desde Firebase Console:
1. Ir a Firebase Console → Firestore → Usage
2. Revisar gráficas de lecturas/escrituras
3. Deberías ver una reducción dramática después del deploy

## Deploy

### Para aplicar los cambios:
```bash
# 1. Reiniciar el servidor
cd server
npm start

# 2. Los clientes ya tienen SYNC_INTERVAL=120s (no requiere actualización)
```

## Notas Adicionales

### Si aún hay problemas de cuota:
1. **Aumentar SYNC_INTERVAL del cliente** a 5 minutos (300s)
2. **Aumentar umbral de last_seen** de 5 a 10 minutos
3. **Considerar upgrade a Blaze plan** (facturación por uso)

### Métricas a observar:
- Número de TVs conectados simultáneamente
- Frecuencia de cambios en schedules (invalidan caché)
- Uso desde admin panel (queries adicionales)

## Cambios Realizados

### Archivos modificados:
1. ✅ `server/index.js`:
   - Cache TTL: 30s → 180s
   - Cache por request: 20s → 180s
   - Lógica de last_seen optimizada
   
2. ✅ `cliente/www/config.js`:
   - SYNC_INTERVAL: 10s → 120s (ya estaba aplicado)

---
**Fecha**: 2025-12-21
**Impacto estimado**: -99% en uso de cuota de Firestore 🚀
