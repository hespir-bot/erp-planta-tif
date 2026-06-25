import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';
import Login from './components/Login';
import DashboardSupervisor from './components/DashboardSupervisor';
import PantallaOperario from './components/PantallaOperario';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión guardada
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.rol === 'supervisor' ? '/supervisor' : '/operario'} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/supervisor"
          element={
            user && user.rol === 'supervisor' ? (
              <DashboardSupervisor user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/operario"
          element={
            user && user.rol === 'operario' ? (
              <PantallaOperario user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to={user ? (user.rol === 'supervisor' ? '/supervisor' : '/operario') : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;
