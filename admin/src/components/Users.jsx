import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FaUserPlus, FaTrash, FaUserShield, FaUserEdit } from 'react-icons/fa';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('editor');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUserId, setEditingUserId] = useState(null);
    const [editPassword, setEditPassword] = useState('');

    // Hardcoded super admins for display purposes (cannot be deleted/edited)
    const superAdmins = ['ueservicesllc1@gmail.com', 'leyanis@prontoenvios.us'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const fetchedUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(fetchedUsers);
            setError(''); // Clear any previous errors on success
            console.log(`✅ ${fetchedUsers.length} usuarios cargados desde Firebase`);
        } catch (err) {
            console.error("❌ Error fetching users:", err);

            // Provide more detailed error message
            if (err.code === 'permission-denied') {
                setError('⚠️ Sin permisos para leer usuarios. Verifica las reglas de Firestore.');
            } else if (err.code === 'unavailable') {
                setError('⚠️ Firebase no disponible. Verifica tu conexión.');
            } else {
                setError(`⚠️ Error: ${err.message || 'Error al cargar usuarios'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newUserEmail) {
            setError('Ingresa un correo electrónico');
            setTimeout(() => setError(''), 5000);
            return;
        }

        if (!newUserPassword || newUserPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setTimeout(() => setError(''), 5000);
            return;
        }

        try {
            // Create user in Firebase Authentication
            await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);

            // Save user role and data in Firestore
            await setDoc(doc(db, 'users', newUserEmail), {
                email: newUserEmail,
                role: newUserRole,
                createdAt: new Date()
            });

            setSuccess(`✅ Usuario ${newUserEmail} creado exitosamente como ${newUserRole}`);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('editor');

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Auto-clear success message after 5 seconds
            setTimeout(() => setSuccess(''), 5000);

            fetchUsers(); // Refresh list
        } catch (err) {
            console.error("Error adding user:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError('⚠️ Este correo ya está registrado');
            } else if (err.code === 'auth/invalid-email') {
                setError('⚠️ Correo electrónico inválido');
            } else if (err.code === 'auth/weak-password') {
                setError('⚠️ La contraseña es muy débil');
            } else {
                setError(`⚠️ Error: ${err.message}`);
            }
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

        setError('');
        setSuccess('');

        try {
            await deleteDoc(doc(db, 'users', userId));
            setSuccess(`✅ Usuario ${userId} eliminado exitosamente`);

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Auto-clear success message after 5 seconds
            setTimeout(() => setSuccess(''), 5000);

            fetchUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
            setError('⚠️ Error al eliminar usuario');
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleUpdatePassword = async (userId) => {
        if (!editPassword || editPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setTimeout(() => setError(''), 5000);
            return;
        }

        setError('');
        setSuccess('');

        try {
            const response = await fetch('http://localhost:3000/api/update-user-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userId, password: editPassword })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`✅ Contraseña actualizada exitosamente para ${userId}`);
                setEditingUserId(null);
                setEditPassword('');

                // Scroll to top to show success message
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Auto-clear success message after 5 seconds
                setTimeout(() => setSuccess(''), 5000);
            } else {
                setError(`⚠️ ${data.error || 'Error al actualizar contraseña'}`);
                setTimeout(() => setError(''), 5000);
            }
        } catch (err) {
            console.error("Error updating password:", err);
            setError('⚠️ Error de conexión al actualizar contraseña');
            setTimeout(() => setError(''), 5000);
        }
    };

    return (
        <div className="users-container" style={{ padding: '20px', color: '#333' }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>Gestión de Usuarios</h2>

            {/* Global messages - visible for all operations */}
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

            <div className="add-user-card" style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '30px',
                border: '1px solid #ddd',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ color: '#333', marginBottom: '15px' }}><FaUserPlus /> Agregar Nuevo Usuario</h3>
                {error && <p className="error-msg" style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '5px', border: '1px solid #f5c6cb' }}>{error}</p>}
                {success && <p className="success-msg" style={{ color: '#51cf66' }}>{success}</p>}

                <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>Correo Electrónico</label>
                        <input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            required
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

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>Contraseña</label>
                        <input
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            minLength={6}
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

                    <div style={{ width: '150px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>Rol</label>
                        <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
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
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

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
                </form>
            </div>

            <div className="users-list" style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#333', marginBottom: '15px' }}>Usuarios Actuales</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Usuario</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Rol</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: '#333', fontWeight: 'bold' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Render Super Admins first */}
                        {superAdmins.map(email => (
                            <React.Fragment key={email}>
                                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#333', fontWeight: '500' }}>
                                        <span style={{ color: '#ffd700', fontSize: '18px' }}>👑</span> {email}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span className="role-badge" style={{
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
                                                setEditingUserId(editingUserId === email ? null : email);
                                                setEditPassword('');
                                                setError('');
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: editingUserId === email ? '#F58342' : '#ffd700',
                                                cursor: 'pointer',
                                                fontSize: '16px'
                                            }}
                                            title="Cambiar contraseña"
                                        >
                                            <FaUserEdit />
                                        </button>
                                    </td>
                                </tr>
                                {editingUserId === email && (
                                    <tr style={{ borderBottom: '1px solid #dee2e6', background: '#fffacd' }}>
                                        <td colSpan="3" style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <label style={{ color: '#333', fontWeight: '500' }}>Nueva Contraseña:</label>
                                                <input
                                                    type="password"
                                                    value={editPassword}
                                                    onChange={(e) => setEditPassword(e.target.value)}
                                                    placeholder="Mínimo 6 caracteres"
                                                    minLength={6}
                                                    style={{
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        flex: 1,
                                                        maxWidth: '300px'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleUpdatePassword(email)}
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
                                                        setEditingUserId(null);
                                                        setEditPassword('');
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

                        {users.filter(u => !superAdmins.includes(u.email)).map(user => (
                            <React.Fragment key={user.id}>
                                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                                    <td style={{ padding: '12px', color: '#333' }}>{user.email}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span className="role-badge" style={{
                                            background: user.role === 'admin' ? '#F58342' : '#3498db',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px'
                                        }}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => {
                                                setEditingUserId(editingUserId === user.id ? null : user.id);
                                                setEditPassword('');
                                                setError('');
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: editingUserId === user.id ? '#F58342' : '#3498db',
                                                cursor: 'pointer',
                                                fontSize: '16px'
                                            }}
                                            title="Cambiar contraseña"
                                        >
                                            <FaUserEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '16px' }}
                                            title="Eliminar usuario"
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                                {editingUserId === user.id && (
                                    <tr style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                                        <td colSpan="3" style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <label style={{ color: '#333', fontWeight: '500' }}>Nueva Contraseña:</label>
                                                <input
                                                    type="password"
                                                    value={editPassword}
                                                    onChange={(e) => setEditPassword(e.target.value)}
                                                    placeholder="Mínimo 6 caracteres"
                                                    minLength={6}
                                                    style={{
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        flex: 1,
                                                        maxWidth: '300px'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleUpdatePassword(user.id)}
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
                                                        setEditingUserId(null);
                                                        setEditPassword('');
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
                                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                    No hay usuarios adicionales configurados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Users;
