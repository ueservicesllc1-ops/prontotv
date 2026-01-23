# Sistema de Roles - ProntoTV Admin

## 🔐 Usuarios y Permisos

### 👑 Super Admin
**Credenciales:** 
- Usuario: `luisuf`
- PIN: `1619`

**Permisos:**
- ✅ Acceso total al sistema
- ✅ Ver y gestionar TVs, Videos, Programación
- ✅ Ver Vista en Vivo
- ✅ **VER** botón de Usuarios
- ✅ **CREAR** nuevos usuarios (Admin o Editor)
- ✅ **ELIMINAR** usuarios (excepto super admin)
- ✅ Protegido - No se puede eliminar

---

### 🛡️ Admin
**Creado desde el panel por Super Admin**

**Permisos:**
- ✅ Acceso total al sistema
- ✅ Ver y gestionar TVs, Videos, Programación
- ✅ Ver Vista en Vivo
- ✅ **VER** botón de Usuarios
- ✅ **CREAR** nuevos usuarios (Admin o Editor)
- ✅ **VER LISTA** de todos los usuarios
- ❌ NO puede eliminar usuarios (solo Super Admin puede)

---

### ✏️ Editor
**Creado desde el panel por Super Admin o Admin**

**Permisos:**
- ✅ Ver y gestionar TVs, Videos, Programación
- ✅ Ver Vista en Vivo
- ❌ **NO VE** el botón de Usuarios en el menú
- ❌ **NO PUEDE** crear usuarios
- ❌ **NO PUEDE** ver la lista de usuarios
- ❌ **NO PUEDE** eliminar usuarios

---

## 📊 Tabla Comparativa

| Función | Super Admin | Admin | Editor |
|---------|-------------|-------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| Gestionar TVs | ✅ | ✅ | ✅ |
| Gestionar Videos | ✅ | ✅ | ✅ |
| Gestionar Programación | ✅ | ✅ | ✅ |
| Vista en Vivo | ✅ | ✅ | ✅ |
| **Ver Botón Usuarios** | ✅ | ✅ | ❌ |
| **Crear Usuarios** | ✅ | ✅ | ❌ |
| **Eliminar Usuarios** | ✅ | ❌ | ❌ |

---

## 🧪 Cómo Probar el Sistema

### 1. Crear un Admin:
```
Usuario: admin1
Nombre: Admin de Prueba
PIN: 2024
Rol: Admin
```

### 2. Crear un Editor:
```
Usuario: editor1
Nombre: Editor de Prueba
PIN: 3030
Rol: Editor
```

### 3. Probar los Permisos:

**Como Super Admin (luisuf):**
- Verás el botón "Usuarios" en el menú
- Podrás crear y eliminar usuarios

**Como Admin (admin1 - PIN: 2024):**
- Cerrar sesión y login con admin1/2024
- Verás el botón "Usuarios" en el menú
- Podrás crear usuarios
- NO podrás eliminar usuarios (botón de eliminar no aparece)

**Como Editor (editor1 - PIN: 3030):**
- Cerrar sesión y login con editor1/3030
- **NO** verás el botón "Usuarios" en el menú
- Solo tendrás acceso a TVs, Videos, Programación y Vista en Vivo

---

## 🔒 Seguridad

### Protección en el Frontend:
- ✅ Botón de Usuarios oculto para Editores
- ✅ Formulario de crear usuarios oculto para no-admins
- ✅ Verificación de rol antes de renderizar componentes

### Protección en Firestore:
- ⚠️ Actualmente las reglas permiten acceso público para desarrollo
- 🔜 Recomendado: Implementar verificación de roles en las reglas de Firestore
- 🔜 Recomendado: Mover operaciones de usuarios al backend para mayor seguridad

---

## 📝 Notas Importantes

1. **Super Admin Hardcodeado:** `luisuf` está codificado en `Login.jsx` y no se puede eliminar
2. **PIN en Texto Plano:** Los PINs se guardan en texto plano en Firestore (para desarrollo)
3. **Sesión en localStorage:** La sesión se mantiene en el navegador hasta logout
4. **Colección Firestore:** Los usuarios se guardan en `adminUsers`

---

## 🚀 Estado Actual

✅ Sistema funcionando al 100%
✅ Roles correctamente implementados
✅ Restricciones de acceso aplicadas
✅ Super Admin protegido
✅ Interfaz adaptada según rol
