import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { FaUserPlus, FaTrash, FaUserShield, FaUser, FaEdit } from 'react-icons/fa';

const Users = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUsername, setNewUsername] = useState('');
    const [newPin, setNewPin] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('editor');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados para cambiar PIN
    const [editingPinUserId, setEditingPinUserId] = useState(null);
    const [newPinValue, setNewPinValue] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');

    const isSuperAdmin = currentUser?.role === 'superadmin';
    const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'adminUsers'));
            const fetchedUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(fetchedUsers);
            setError('');
            console.log(`✅ ${fetchedUsers.length} usuarios cargados`);
        } catch (err) {
            console.error("❌ Error fetching users:", err);
            setError('⚠️ Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validaciones
        if (!newUsername || newUsername.length < 3) {
            setError('El usuario debe tener al menos 3 caracteres');
            setTimeout(() => setError(''), 5000);
            return;
        }

        if (!newPin || newPin.length < 4) {
            setError('El PIN debe tener al menos 4 dígitos');
            setTimeout(() => setError(''), 5000);
            return;
        }

        if (!/^\d+$/.test(newPin)) {
            setError('El PIN solo puede contener números');
            setTimeout(() => setError(''), 5000);
            return;
        }

        // Verificar si el usuario ya existe
        if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            setError('⚠️ Este usuario ya existe');
            setTimeout(() => setError(''), 5000);
            return;
        }

        try {
            const userDoc = {
                username: newUsername.toLowerCase(),
                pin: newPin,
                name: newName || newUsername,
                role: newRole,
                createdAt: new Date(),
                createdBy: currentUser.username
            };

            await setDoc(doc(db, 'adminUsers', newUsername.toLowerCase()), userDoc);

            setSuccess(`✅ Usuario ${newUsername} creado exitosamente`);
            setNewUsername('');
            setNewPin('');
            setNewName('');
            setNewRole('editor');

            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(''), 5000);

            fetchUsers();
        } catch (err) {
            console.error("Error adding user:", err);
            setError(`⚠️ Error: ${err.message}`);
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm(`¿Estás seguro de eliminar el usuario "${userId}"?`)) return;

        setError('');
        setSuccess('');

        try {
            await deleteDoc(doc(db, 'adminUsers', userId));
            setSuccess(`✅ Usuario ${userId} eliminado exitosamente`);

            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(''), 5000);

            fetchUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
            setError('⚠️ Error al eliminar usuario');
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleChangePin = async (userId, isSuperAdminUser = false) => {
        setError('');
        setSuccess('');

        // Validaciones
        if (!newPinValue || newPinValue.length < 4) {
            setError('El nuevo PIN debe tener al menos 4 dígitos');
            setTimeout(() => setError(''), 5000);
            return;
        }

        if (!/^\d+$/.test(newPinValue)) {
            setError('El PIN solo puede contener números');
            setTimeout(() => setError(''), 5000);
            return;
        }

        if (newPinValue !== confirmNewPin) {
            setError('Los PINs no coinciden');
            setTimeout(() => setError(''), 5000);
            return;
        }

        try {
            if (isSuperAdminUser) {
                // Para super admin, actualizar en localStorage
                // Nota: El super admin no está en Firestore, solo en código
                // Actualizar la sesión actual si es el super admin quien cambia su PIN
                if (currentUser.username === 'luisuf') {
                    const updatedUser = { ...currentUser };
                    localStorage.setItem('prontotvUser', JSON.stringify(updatedUser));
                }

                setSuccess(`✅ PIN del Super Admin actualizado. IMPORTANTE: Recuerda el nuevo PIN (${newPinValue}) - Actualiza el código en Login.jsx`);
                setEditingPinUserId(null);
                setNewPinValue('');
                setConfirmNewPin('');

                setTimeout(() => setSuccess(''), 10000);
            } else {
                // Para usuarios normales, actualizar en Firestore
                const userRef = doc(db, 'adminUsers', userId);
                await setDoc(userRef, {
                    pin: newPinValue
                }, { merge: true });

                setSuccess(`✅ PIN actualizado exitosamente para ${userId}`);
                setEditingPinUserId(null);
                setNewPinValue('');
                setConfirmNewPin('');

                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => setSuccess(''), 5000);

                // Actualizar lista para reflejar cambios
                fetchUsers();
            }
        } catch (err) {
            console.error("Error changing PIN:", err);
            setError(`⚠️ Error al cambiar PIN: ${err.message}`);
            setTimeout(() => setError(''), 5000);
        }
    };


    const getRoleIcon = (role) => {
        switch (role) {
            case 'superadmin':
                return <span style={{ fontSize: '20px' }}>👑</span>;
            case 'admin':
                return <FaUserShield />;
            case 'editor':
                return <FaEdit />;
            default:
                return <FaUser />;
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'superadmin':
                return 'SUPER ADMIN';
            case 'admin':
                return 'ADMINISTRADOR';
            case 'editor':
                return 'EDITOR';
            default:
                return role.toUpperCase();
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'superadmin':
                return '#ffd700';
            case 'admin':
                return '#F58342';
            case 'editor':
                return '#3498db';
            default:
                return '#6c757d';
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#333' }}>
                <h2>Cargando usuarios...</h2>
            </div>
        );
    }

    return (
        <div className="users-container" style={{ padding: '20px', color: '#333' }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>
                <FaUserShield /> Gestión de Usuarios
            </h2>

            {/* Global messages */}
            {error && (
                <div style={{
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '12px 20px',
                    borderRadius: '5px',
                    border: '1px solid #f5c6cb',
                    marginBottom: '20px',
                    fontWeight: '500'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    background: '#d4edda',
                    color: '#155724',
                    padding: '12px 20px',
                    borderRadius: '5px',
                    border: '1px solid #c3e6cb',
                    marginBottom: '20px',
                    fontWeight: '500'
                }}>
                    {success}
                </div>
            )}

            {/* Add User Form - Solo para admins */}
            {isAdmin && (
                <div className="add-user-card" style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    marginBottom: '30px',
                    border: '1px solid #ddd',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ color: '#333', marginBottom: '15px' }}>
                        <FaUserPlus /> Agregar Nuevo Usuario
                    </h3>

                    <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '150px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                                Usuario
                            </label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="usuario123"
                                required
                                minLength={3}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    color: '#333',
                                    borderRadius: '5px'
                                }}
                            />
                        </div>

                        <div style={{ flex: '1', minWidth: '150px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Nombre completo"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    color: '#333',
                                    borderRadius: '5px'
                                }}
                            />
                        </div>

                        <div style={{ width: '120px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                                PIN
                            </label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                                placeholder="1234"
                                required
                                minLength={4}
                                maxLength={6}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    color: '#333',
                                    borderRadius: '5px'
                                }}
                            />
                        </div>

                        <div style={{ width: '140px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                                Rol
                            </label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    color: '#333',
                                    borderRadius: '5px'
                                }}
                            >
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" style={{
                                padding: '10px 20px',
                                background: '#F58342',
                                border: 'none',
                                borderRadius: '5px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}>
                                Agregar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users List */}
            <div className="users-list" style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ color: '#333', marginBottom: '15px' }}>Usuarios del Sistema</h3>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Usuario</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Nombre</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Rol</th>
                            {isAdmin && <th style={{ padding: '12px', textAlign: 'right', color: '#333', fontWeight: 'bold' }}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Super Admin */}
                        <tr style={{ borderBottom: '1px solid #dee2e6', background: '#fffacd' }}>
                            <td style={{ padding: '12px', color: '#333', fontWeight: '500' }}>
                                <span style={{ marginRight: '8px' }}>👑</span>
                                luisuf
                            </td>
                            <td style={{ padding: '12px', color: '#333' }}>Luis (Super Admin)</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    background: '#ffd700',
                                    color: 'black',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    SUPER ADMIN
                                </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                <button
                                    onClick={() => {
                                        if (editingPinUserId === 'luisuf') {
                                            setEditingPinUserId(null);
                                            setNewPinValue('');
                                            setConfirmNewPin('');
                                        } else {
                                            setEditingPinUserId('luisuf');
                                            setNewPinValue('');
                                            setConfirmNewPin('');
                                            setError('');
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: editingPinUserId === 'luisuf' ? '#F58342' : '#ffd700',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold'
                                    }}
                                    title="Cambiar PIN"
                                >
                                    🔐 Cambiar PIN
                                </button>
                            </td>
                        </tr>

                        {/* Formulario para cambiar PIN del Super Admin */}
                        {editingPinUserId === 'luisuf' && (
                            <tr style={{ borderBottom: '1px solid #dee2e6', background: '#fffacd' }}>
                                <td colSpan="4" style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <label style={{ color: '#333', fontWeight: '500' }}>Nuevo PIN:</label>
                                        <input
                                            type="password"
                                            value={newPinValue}
                                            onChange={(e) => setNewPinValue(e.target.value)}
                                            placeholder="Mínimo 4 dígitos"
                                            minLength={4}
                                            maxLength={6}
                                            pattern="[0-9]*"
                                            inputMode="numeric"
                                            style={{
                                                padding: '8px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                width: '120px'
                                            }}
                                        />
                                        <label style={{ color: '#333', fontWeight: '500' }}>Confirmar PIN:</label>
                                        <input
                                            type="password"
                                            value={confirmNewPin}
                                            onChange={(e) => setConfirmNewPin(e.target.value)}
                                            placeholder="Repetir PIN"
                                            minLength={4}
                                            maxLength={6}
                                            pattern="[0-9]*"
                                            inputMode="numeric"
                                            style={{
                                                padding: '8px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                width: '120px'
                                            }}
                                        />
                                        <button
                                            onClick={() => handleChangePin('luisuf', true)}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#51cf66',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingPinUserId(null);
                                                setNewPinValue('');
                                                setConfirmNewPin('');
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#868e96',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Other users */}
                        {users.map(user => (
                            <React.Fragment key={user.id}>
                                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                                    <td style={{ padding: '12px', color: '#333' }}>
                                        <span style={{ marginRight: '8px' }}>{getRoleIcon(user.role)}</span>
                                        {user.username}
                                    </td>
                                    <td style={{ padding: '12px', color: '#333' }}>{user.name || user.username}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            background: getRoleColor(user.role),
                                            color: user.role === 'superadmin' ? 'black' : 'white',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => {
                                                    if (editingPinUserId === user.id) {
                                                        setEditingPinUserId(null);
                                                        setNewPinValue('');
                                                        setConfirmNewPin('');
                                                    } else {
                                                        setEditingPinUserId(user.id);
                                                        setNewPinValue('');
                                                        setConfirmNewPin('');
                                                        setError('');
                                                    }
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: editingPinUserId === user.id ? '#F58342' : '#3498db',
                                                    cursor: 'pointer',
                                                    fontSize: '16px'
                                                }}
                                                title="Cambiar PIN"
                                            >
                                                🔐
                                            </button>
                                            {isSuperAdmin && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ff6b6b',
                                                        cursor: 'pointer',
                                                        fontSize: '16px'
                                                    }}
                                                    title="Eliminar usuario"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>

                                {/* Formulario para cambiar PIN del usuario */}
                                {editingPinUserId === user.id && (
                                    <tr style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                                        <td colSpan="4" style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <label style={{ color: '#333', fontWeight: '500' }}>Nuevo PIN:</label>
                                                <input
                                                    type="password"
                                                    value={newPinValue}
                                                    onChange={(e) => setNewPinValue(e.target.value)}
                                                    placeholder="Mínimo 4 dígitos"
                                                    minLength={4}
                                                    maxLength={6}
                                                    pattern="[0-9]*"
                                                    inputMode="numeric"
                                                    style={{
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        width: '120px'
                                                    }}
                                                />
                                                <label style={{ color: '#333', fontWeight: '500' }}>Confirmar PIN:</label>
                                                <input
                                                    type="password"
                                                    value={confirmNewPin}
                                                    onChange={(e) => setConfirmNewPin(e.target.value)}
                                                    placeholder="Repetir PIN"
                                                    minLength={4}
                                                    maxLength={6}
                                                    pattern="[0-9]*"
                                                    inputMode="numeric"
                                                    style={{
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        width: '120px'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleChangePin(user.id, false)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#51cf66',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingPinUserId(null);
                                                        setNewPinValue('');
                                                        setConfirmNewPin('');
                                                    }}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#868e96',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}

                        {users.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? "4" : "3"} style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#666',
                                    fontStyle: 'italic'
                                }}>
                                    No hay usuarios adicionales configurados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {!isAdmin && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '5px',
                    color: '#856404'
                }}>
                    ℹ️ No tienes permisos para administrar usuarios. Solo admins y super admins pueden gestionar usuarios.
                </div>
            )}
        </div>
    );
};

export default Users;
