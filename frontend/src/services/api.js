import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token a todas las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de Autenticación
export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/me'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Servicios para Supervisor
export const supervisorService = {
  getTareasHoy: () => api.get('/supervisor/tareas-hoy'),
  asignarTarea: (data) => api.post('/supervisor/asignar-tarea', data),
  validarTarea: (asignacion_id) =>
    api.post(`/supervisor/validar-tarea/${asignacion_id}`),
  getOperarios: () => api.get('/supervisor/operarios')
};

// Servicios para Operario
export const operarioService = {
  getMisTareas: () => api.get('/operario/mis-tareas'),
  iniciarTarea: (asignacion_id) =>
    api.post(`/operario/iniciar-tarea/${asignacion_id}`),
  terminarTarea: (asignacion_id) =>
    api.post(`/operario/terminar-tarea/${asignacion_id}`)
};

// Servicios Generales
export const generalService = {
  getAreas: () => api.get('/areas'),
  getTareas: (area_id) => api.get(`/tareas/${area_id}`),
  health: () => api.get('/health')
};

export default api;
