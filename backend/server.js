require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'planta_tif',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password123'
});

pool.on('error', (err) => {
  console.error('Pool error:', err);
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ============================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const result = await pool.query(
      'SELECT id, email, nombre, rol, area_id FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const passwordResult = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [user.id]
    );

    const passwordHash = passwordResult.rows[0].password_hash;
    const validPassword = await bcryptjs.compare(password, passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        area_id: user.area_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en login' });
  }
});

// ============================================================
// RUTAS PARA SUPERVISOR
// ============================================================

// Obtener mis tareas del día (supervisor ve todas sus asignaciones)
app.get('/api/supervisor/tareas-hoy', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(`
      SELECT
        a.id,
        u.nombre as operario_nombre,
        t.tipo as tarea_tipo,
        a.cantidad,
        a.unidad,
        a.estado,
        t.tiempo_standar_min,
        EXTRACT(EPOCH FROM (
          SELECT COALESCE(MAX(hora_fin), CURRENT_TIMESTAMP) - MIN(hora_inicio)
          FROM registros_tiempo rt WHERE rt.asignacion_id = a.id
        ))/60 as minutos_transcurridos
      FROM asignaciones a
      JOIN usuarios u ON a.operario_id = u.id
      JOIN tareas t ON a.tarea_id = t.id
      WHERE a.fecha = CURRENT_DATE
      AND u.supervisor_id = $1
      ORDER BY a.created_at
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supervisor tasks:', error);
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

// Asignar nueva tarea
app.post('/api/supervisor/asignar-tarea', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { operario_id, tarea_id, cantidad, unidad } = req.body;

    if (!operario_id || !tarea_id || !cantidad || !unidad) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const result = await pool.query(`
      INSERT INTO asignaciones (operario_id, tarea_id, fecha, cantidad, unidad, estado)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, 'pendiente')
      RETURNING *
    `, [operario_id, tarea_id, cantidad, unidad]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Error asignando tarea' });
  }
});

// Validar tarea completada
app.post('/api/supervisor/validar-tarea/:asignacion_id', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { asignacion_id } = req.params;

    await pool.query(`
      UPDATE registros_tiempo
      SET validado = true, validador_id = $1
      WHERE asignacion_id = $2 AND validado = false
    `, [req.user.id, asignacion_id]);

    res.json({ message: 'Tarea validada' });
  } catch (error) {
    console.error('Error validating task:', error);
    res.status(500).json({ error: 'Error validando tarea' });
  }
});

// ============================================================
// RUTAS PARA OPERARIO
// ============================================================

// Obtener mis tareas de hoy
app.get('/api/operario/mis-tareas', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'operario') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(`
      SELECT
        a.id,
        t.tipo,
        t.descripcion,
        t.tiempo_standar_min,
        a.cantidad,
        a.unidad,
        a.estado,
        COALESCE((
          SELECT EXTRACT(EPOCH FROM (hora_fin - hora_inicio))/60
          FROM registros_tiempo rt
          WHERE rt.asignacion_id = a.id
          ORDER BY rt.created_at DESC LIMIT 1
        ), 0) as minutos_transcurridos
      FROM asignaciones a
      JOIN tareas t ON a.tarea_id = t.id
      WHERE a.operario_id = $1
      AND a.fecha = CURRENT_DATE
      ORDER BY a.estado DESC, a.created_at
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching operator tasks:', error);
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

// Iniciar tarea
app.post('/api/operario/iniciar-tarea/:asignacion_id', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'operario') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { asignacion_id } = req.params;

    // Actualizar estado de asignación
    await pool.query(
      'UPDATE asignaciones SET estado = $1 WHERE id = $2',
      ['iniciada', asignacion_id]
    );

    // Crear registro de tiempo
    const result = await pool.query(`
      INSERT INTO registros_tiempo (asignacion_id, hora_inicio)
      VALUES ($1, CURRENT_TIMESTAMP)
      RETURNING id, hora_inicio
    `, [asignacion_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: 'Error iniciando tarea' });
  }
});

// Terminar tarea
app.post('/api/operario/terminar-tarea/:asignacion_id', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'operario') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { asignacion_id } = req.params;

    // Obtener el registro de tiempo activo
    const registroResult = await pool.query(`
      SELECT id, hora_inicio FROM registros_tiempo
      WHERE asignacion_id = $1 AND hora_fin IS NULL
      ORDER BY created_at DESC LIMIT 1
    `, [asignacion_id]);

    if (registroResult.rows.length === 0) {
      return res.status(400).json({ error: 'No hay tarea activa' });
    }

    const registro = registroResult.rows[0];
    const horaFin = new Date();
    const minutos = Math.round((horaFin - new Date(registro.hora_inicio)) / 60000);

    // Actualizar registro de tiempo
    await pool.query(`
      UPDATE registros_tiempo
      SET hora_fin = CURRENT_TIMESTAMP, minutos_reales = $1
      WHERE id = $2
    `, [minutos, registro.id]);

    // Actualizar estado de asignación
    await pool.query(
      'UPDATE asignaciones SET estado = $1 WHERE id = $2',
      ['completada', asignacion_id]
    );

    res.json({
      message: 'Tarea terminada',
      minutos_reales: minutos,
      registro_id: registro.id
    });
  } catch (error) {
    console.error('Error ending task:', error);
    res.status(500).json({ error: 'Error terminando tarea' });
  }
});

// ============================================================
// RUTAS GENERALES
// ============================================================

// Obtener mi información
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nombre, rol, area_id FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});

// Obtener áreas
app.get('/api/areas', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, proteina FROM areas');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ error: 'Error obteniendo áreas' });
  }
});

// Obtener tareas de un área
app.get('/api/tareas/:area_id', authenticateToken, async (req, res) => {
  try {
    const { area_id } = req.params;
    const result = await pool.query(
      'SELECT id, tipo, descripcion, tiempo_standar_min FROM tareas WHERE area_id = $1',
      [area_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

// Obtener operarios de un supervisor
app.get('/api/supervisor/operarios', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE supervisor_id = $1 AND rol = $2',
      [req.user.id, 'operario']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({ error: 'Error obteniendo operarios' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Backend servidor iniciado en puerto ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
