import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Login.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Super Admin hardcodeado
    const SUPER_ADMIN = {
        username: 'luisuf',
        pin: '1619',
        role: 'superadmin',
        name: 'Luis (Super Admin)'
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Verificar si es el super admin
            if (username.toLowerCase() === SUPER_ADMIN.username && pin === SUPER_ADMIN.pin) {
                const user = {
                    username: SUPER_ADMIN.username,
                    role: SUPER_ADMIN.role,
                    name: SUPER_ADMIN.name
                };
                localStorage.setItem('prontotvUser', JSON.stringify(user));
                onLogin(user);
                return;
            }

            // Buscar usuario en Firestore
            const usersRef = collection(db, 'adminUsers');
            const q = query(usersRef, where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('❌ Usuario no encontrado');
                setLoading(false);
                return;
            }

            const userData = querySnapshot.docs[0].data();

            // Verificar PIN (comparación simple - en producción se debería hashear)
            if (userData.pin !== pin) {
                setError('❌ PIN incorrecto');
                setLoading(false);
                return;
            }

            // Login exitoso
            const user = {
                username: userData.username,
                role: userData.role,
                name: userData.name || userData.username
            };

            localStorage.setItem('prontotvUser', JSON.stringify(user));
            onLogin(user);

        } catch (err) {
            console.error('Error en login:', err);
            setError('❌ Error al iniciar sesión');
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src="/logo.png" alt="ProntoTV" className="login-logo" />
                    <h1>ProntoTV Admin</h1>
                    <p>Iniciar Sesión</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingresa tu usuario"
                            required
                            autoComplete="username"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>PIN</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Ingresa tu PIN"
                            required
                            maxLength={6}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            autoComplete="off"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Verificando...' : 'Ingresar'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>🔐 Acceso seguro con PIN</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
