import React, { useState } from 'react';
import { authService } from '../services/api';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      const { token, user } = response.data;
      onLogin(token, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Error en login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Sistema ERP Planta TIF</h1>
        <p className="subtitle">Control de Productividad</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@plantaTIF.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? 'Ingresando...' : 'INGRESAR'}
          </button>
        </form>

        <div className="demo-users">
          <p>Usuarios de prueba:</p>
          <small>Supervisor: santiago@plantaTIF.com / password123</small>
          <small>Operario: alejandro@plantaTIF.com / password123</small>
        </div>
      </div>
    </div>
  );
}

export default Login;
