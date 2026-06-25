-- Script de Inicialización - Base de Datos MVP Planta TIF
-- Este script crea todas las tablas necesarias para el MVP

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla: usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('supervisor', 'operario')),
  supervisor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  area_id UUID,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: areas
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  proteina VARCHAR(50) NOT NULL CHECK (proteina IN ('res', 'pollo', 'cerdo')),
  supervisor_id UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar constraint de área a usuarios (después de crear tabla areas)
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_area
  FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;

-- Tabla: tareas
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tiempo_standar_min INTEGER NOT NULL,
  area_id UUID NOT NULL REFERENCES areas(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: asignaciones
CREATE TABLE asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id UUID NOT NULL REFERENCES usuarios(id),
  tarea_id UUID NOT NULL REFERENCES tareas(id),
  fecha DATE NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  unidad VARCHAR(50) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'iniciada', 'completada')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: registros_tiempo
CREATE TABLE registros_tiempo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asignacion_id UUID NOT NULL REFERENCES asignaciones(id) ON DELETE CASCADE,
  hora_inicio TIMESTAMP NOT NULL,
  hora_fin TIMESTAMP,
  minutos_reales INTEGER,
  validado BOOLEAN DEFAULT false,
  validador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_usuarios_supervisor ON usuarios(supervisor_id);
CREATE INDEX idx_usuarios_area ON usuarios(area_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_areas_proteina ON areas(proteina);
CREATE INDEX idx_tareas_area ON tareas(area_id);
CREATE INDEX idx_asignaciones_operario ON asignaciones(operario_id);
CREATE INDEX idx_asignaciones_fecha ON asignaciones(fecha);
CREATE INDEX idx_asignaciones_estado ON asignaciones(estado);
CREATE INDEX idx_registros_asignacion ON registros_tiempo(asignacion_id);
CREATE INDEX idx_registros_validador ON registros_tiempo(validador_id);

-- Datos de prueba
-- Crear área: Deshuese RES
INSERT INTO areas (nombre, proteina, supervisor_id) VALUES
('Deshuese RES', 'res', (
  WITH sup AS (
    INSERT INTO usuarios (email, nombre, password_hash, rol)
    VALUES ('santiago@plantaTIF.com', 'Santiago López',
            crypt('password123', gen_salt('bf')), 'supervisor')
    RETURNING id
  ) SELECT id FROM sup
));

-- Obtener ID del supervisor creado para usarlo en otras inserciones
WITH sup_id AS (
  SELECT id FROM usuarios WHERE email = 'santiago@plantaTIF.com'
),
area_id_val AS (
  SELECT id FROM areas WHERE nombre = 'Deshuese RES'
)
INSERT INTO usuarios (email, nombre, password_hash, rol, supervisor_id, area_id)
VALUES
('alejandro@plantaTIF.com', 'Alejandro Ruiz', crypt('password123', gen_salt('bf')), 'operario',
 (SELECT id FROM sup_id), (SELECT id FROM area_id_val)),
('luis@plantaTIF.com', 'Luis García', crypt('password123', gen_salt('bf')), 'operario',
 (SELECT id FROM sup_id), (SELECT id FROM area_id_val)),
('carlos@plantaTIF.com', 'Carlos Mendez', crypt('password123', gen_salt('bf')), 'operario',
 (SELECT id FROM sup_id), (SELECT id FROM area_id_val)),
('miguel@plantaTIF.com', 'Miguel Torres', crypt('password123', gen_salt('bf')), 'operario',
 (SELECT id FROM sup_id), (SELECT id FROM area_id_val));

-- Crear tareas estándar para el área
WITH area_id_val AS (
  SELECT id FROM areas WHERE nombre = 'Deshuese RES'
)
INSERT INTO tareas (tipo, descripcion, tiempo_standar_min, area_id)
VALUES
('Deshuesar pechuga', 'Deshuesar 1 tonelada de pechuga', 120, (SELECT id FROM area_id_val)),
('Separar pierna y muslo', 'Separar 400 kg de pierna y muslo', 120, (SELECT id FROM area_id_val)),
('Empacar producto', 'Empacar producto terminado', 60, (SELECT id FROM area_id_val)),
('Limpiar y desinfectar', 'Limpiar área de trabajo', 45, (SELECT id FROM area_id_val));

-- Mensaje de confirmación
SELECT 'Database initialized successfully!' as status;
