# Sistema ERP Planta TIF - MVP

Sistema completo para control de productividad y tareas en plantas de procesamiento de alimentos (TIF).

## 📋 Estructura del Proyecto

```
MVP_PROYECTO/
├── database/
│   └── init.sql           # Scripts de creación de BD
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── package.json       # Dependencias Backend
│   └── .env.example       # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # Servicios de API
│   │   ├── styles/        # Estilos CSS
│   │   └── App.js         # Componente principal
│   ├── public/
│   ├── package.json       # Dependencias Frontend
│   └── .env.example       # Variables de entorno
└── README.md
```

## 🚀 Instalación Local

### Requisitos Previos
- Node.js 16+ y npm
- PostgreSQL 12+
- Git

### 1. Clonar el Proyecto

```bash
cd MVP_PROYECTO
```

### 2. Configurar Base de Datos

#### Opción A: PostgreSQL Local
```bash
# Crear base de datos
createdb planta_tif

# Ejecutar script de inicialización
psql -U postgres -d planta_tif -f database/init.sql
```

#### Opción B: Contenedor Docker
```bash
docker run --name postgres-tif \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=planta_tif \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Instalar y Ejecutar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Editar .env con tu configuración
# DB_HOST=localhost (o IP del servidor)
# DB_PASSWORD=tu_contraseña

# Iniciar servidor (desarrollo)
npm run dev

# O en producción
npm start
```

El backend estará disponible en `http://localhost:5000`

### 4. Instalar y Ejecutar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Editar .env
# REACT_APP_API_URL=http://localhost:5000/api

# Iniciar servidor de desarrollo
npm start
```

El frontend estará disponible en `http://localhost:3000`

## 🔐 Usuarios de Prueba

| Email | Rol | Contraseña |
|-------|-----|-----------|
| santiago@plantaTIF.com | Supervisor | password123 |
| alejandro@plantaTIF.com | Operario | password123 |
| luis@plantaTIF.com | Operario | password123 |

## 📱 Funcionalidades MVP

### Supervisor
- ✅ Login y autenticación
- ✅ Ver tareas del día
- ✅ Asignar nuevas tareas
- ✅ Validar tareas completadas
- ✅ Seleccionar área de trabajo

### Operario
- ✅ Login y autenticación
- ✅ Ver tareas asignadas
- ✅ Iniciar tarea (cronómetro)
- ✅ Terminar tarea
- ✅ Ver progreso del turno

## 🌐 Deployment en Producción

### Backend en Railway.app

1. **Crear cuenta en Railway.app**
   - Ir a https://railway.app
   - Registrarse con GitHub

2. **Crear nuevo proyecto**
   - Seleccionar "Deploy from GitHub"
   - Conectar repositorio

3. **Configurar PostgreSQL**
   - En Railway: Add Service → PostgreSQL
   - Copiar DATABASE_URL generada

4. **Configurar variables de entorno**
   ```
   DATABASE_URL = (from Railway PostgreSQL)
   JWT_SECRET = (generar contraseña segura)
   NODE_ENV = production
   ```

5. **Deploy**
   - Railway deploy automático en cada push

### Frontend en Vercel

1. **Crear cuenta en Vercel.com**
   - Ir a https://vercel.com
   - Registrarse

2. **Importar proyecto**
   - Seleccionar repositorio GitHub
   - Vercel auto-detecta Next.js/React

3. **Configurar variables de entorno**
   ```
   REACT_APP_API_URL = https://tu-backend-railway.app/api
   ```

4. **Deploy automático**
   - En cada push a main
   - Preview en cada PR

## 📊 Variables de Entorno

### Backend (.env)
```
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=planta_tif
DB_USER=postgres
DB_PASSWORD=password123

# JWT
JWT_SECRET=tu_secret_muy_seguro
JWT_EXPIRATION=7d

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🔄 Flujo de Autenticación

1. Usuario ingresa email y contraseña en login
2. Backend valida contraseña con bcrypt
3. Se genera JWT token válido por 7 días
4. Frontend almacena token en localStorage
5. Token se envía en header Authorization en cada request
6. Si token expira o es inválido, usuario vuelve a login

## 📈 Estructura de Datos

### Tablas Principales
- **usuarios**: Supervisores y operarios
- **areas**: Áreas de trabajo (Deshuese RES, etc.)
- **tareas**: Tipos de tareas disponibles
- **asignaciones**: Tareas asignadas a operarios
- **registros_tiempo**: Registro de tiempo por tarea

## 🛠️ Desarrollo Futuro (Phase 2)

- [ ] Dashboards avanzados con gráficos
- [ ] Reportes diarios y análisis
- [ ] Alertas automáticas
- [ ] Integración con códigos de barras
- [ ] App móvil nativa
- [ ] Integración Power BI

## 🤝 Contribuir

Las instrucciones para contribuir se encuentran en CONTRIBUTING.md

## 📞 Soporte

Para reportar bugs o sugerencias, crear un issue en GitHub.

## 📄 Licencia

MIT

---

**Versión**: 1.0.0 MVP
**Última actualización**: Junio 2026
