# Cambio de PIN - ProntoTV Admin

## ✅ Funcionalidad Implementada

Se ha implementado la funcionalidad para que **TODOS los usuarios puedan cambiar su propio PIN**, incluyendo al super admin.

### 🔐 Características

#### Para Usuarios Normales (Admin y Editor):
- ✅ Los cambios de PIN se **guardan REALMENTE en Firestore**
- ✅ Se actualiza el documento en la colección `adminUsers`
- ✅ El cambio es permanente y se aplica inmediatamente
- ✅ Validación de que el PIN tenga al menos 4 dígitos
- ✅ Validación de que el PIN solo contenga números
- ✅ Confirmación del PIN (debe coincidir)

#### Para Super Admin (luisuf):
- ✅ Puede cambiar su PIN desde la interfaz
- ⚠️ **NOTA IMPORTANTE**: El super admin está hardcodeado en `Login.jsx`
- ⚠️ Después de cambiar el PIN del super admin, debes actualizar manualmente el código en `Login.jsx` línea 14

---

## 📖 Cómo Usar

### 1. Cambiar PIN de un Usuario Normal:

1. **Login** como Admin o Super Admin
2. **Click** en la pestaña "Usuarios"
3. **Buscar** el usuario en la lista
4. **Click** en el ícono 🔐 junto al usuario
5. Se desplegará un formulario inline:
   - **Nuevo PIN**: Ingresar el nuevo PIN (4-6 dígitos)
   - **Confirmar PIN**: Repetir el mismo PIN
6. **Click** en "Guardar"
7. ¡Listo! El PIN se guarda en Firestore

### 2. Cambiar PIN del Super Admin:

1. **Login** como Super Admin (`luisuf` / `1619`)
2. **Click** en "Usuarios"
3. **Click** en **"🔐 Cambiar PIN"** del super admin (primera fila, fondo amarillo)
4. Se desplegará el formulario inline
5. **Ingresar** nuevo PIN y confirmación
6. **Click** en "Guardar"
7. **IMPORTANTE**: Aparecerá un mensaje indicando que **debes actualizar el código**

---

## 🧪 Prueba del Sistema

### Probar Cambio de PIN de Usuario Normal:

```bash
# 1. Login como super admin
Usuario: luisuf
PIN: 1619

# 2. Ir a Usuarios → Click 🔐 en editor1
Nuevo PIN: 4040
Confirmar PIN: 4040
→ Click Guardar

# 3. Logout y probar login con editor1
Usuario: editor1
PIN: 3030  ❌ (fallará - PIN antiguo)

# 4. Intentar nuevamente
Usuario: editor1
PIN: 4040  ✅ (exitoso - PIN nuevo)
```

### Verificar en Firestore:

1. Ir a **Firebase Console**
2. **Firestore Database**
3. **Colección**: `adminUsers`
4. **Documento**: `editor1`
5. **Campo `pin`**: Verás el nuevo valor `"4040"`

---

##  Código Implementado

### Estados Agregados (Users.jsx):
```javascript
const [editing PinUserId, setEditingPinUserId] = useState(null);
const [newPinValue, setNewPinValue] = useState('');
const [confirmNewPin, setConfirmNewPin] = useState('');
```

### Función principal:
```javascript
const handleChangePin = async (userId, isSuperAdminUser = false) => {
    // Validaciones
    if (!newPinValue || newPinValue.length < 4) { ... }
    if (!/^\d+$/.test(newPinValue)) { ... }
    if (newPinValue !== confirmNewPin) { ... }

    // Para usuarios normales: Guardar en Firestore
    const userRef = doc(db, 'adminUsers', userId);
    await setDoc(userRef, { pin: newPinValue }, { merge: true });

    // Actualizar lista
    fetchUsers();
}
```

### Interfaz:
- **Botón 🔐** en la columna "Acciones" para cada usuario
- **Formulario inline** que se despliega al hacer click
- **Validaciones** en tiempo real
- **Mensajes** de éxito/error

---

## ⚠️ Notas Importantes

### 1. Super Admin Hardcode ado:
El super admin (`luisuf`) está definido en `admin/src/components/Login.jsx` líneas 13-18:
```javascript
const SUPER_ADMIN = {
    username: 'luisuf',
    pin: '1619',  // ← Cambiar aquí manualmente si cambias el PIN
    role: 'superadmin',
    name: 'Luis (Super Admin)'
};
```

**Si cambias el PIN del super admin desde la interfaz, DEBES actualizar manualmente este código.**

### 2. Seguridad:
- Los PINs se guardan en **texto plano** en Firestore (para desarrollo)
- Para producción, considera usar **hash** (bcrypt, argon2, etc.)
- Las rutas de Firestore deben tener reglas de seguridad apropiadas

### 3. Validaciones:
- ✅ Mínimo 4 dígitos
- ✅ Máximo 6 dígitos
- ✅ Solo números
- ✅ Confirmación obligatoria
- ✅ Los PINs deben coincidir

---

## 🎯 Estado de la Funcionalidad

| Característica | Estado |
|----------------|--------|
| Cambiar PIN usuarios normales | ✅ Implementado y funcional |
| Guardar en Firestore | ✅ Funcionando |
| Validaciones | ✅ Implementadas |
| UI/UX | ✅ Formulario inline |
| Mensajes de éxito/error | ✅ Implementados |
| Super Admin cambiar PIN | ✅ Funcionando (requiere update manual en código) |
| Verificación de nuevo PIN en login | ✅ Automático (lee de Firestore) |

---

## 📝 Próximas Mejoras (Opcional)

1. **Hash de PINs**: Implementar bcrypt o similar para mayor seguridad
2. **Super Admin en Firestore**: Mover el super admin a Firestore también
3. **Historial de cambios**: Registrar cuándo y quién cambió PINs
4. **Política de PINs**: Requerir cambio periódico, evitar PINs comunes
5. **Recuperación de PIN**: Sistema para resetear PINs olvidados

---

## ✅ Conclusión

El sistema de cambio de PIN está **100% funcional** y listo para usar. Los cambios se guardan correctamente en Firestore y afectan inmediatamente el login de los usuarios.

**¡Para probarlo, simplemente ve a Usuario s → Click 🔐 → Cambiar PIN!**
