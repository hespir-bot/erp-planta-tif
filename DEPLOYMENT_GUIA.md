# Guía Completa de Deployment - Sistema ERP Planta TIF MVP

## 📋 Tabla de Contenidos
1. Pre-requisitos
2. Instalación Local
3. Testing y Validación
4. Deployment en Producción
5. Monitoreo y Mantenimiento
6. Rollback y Contingencias

---

## 1. Pre-requisitos

### Software Requerido
- Node.js v16.x o superior
- npm v8.x o superior
- PostgreSQL 12+ (o acceso a servicio cloud)
- Git

### Verificar versiones
```bash
node --version     # v16.x o superior
npm --version      # v8.x o superior
psql --version     # 12.x o superior
```

### Cuentas en Servicios Cloud (para producción)
- Railway.app (Backend + PostgreSQL)
- Vercel.com (Frontend React)
- GitHub (repositorio)

---

## 2. Instalación Local (Desarrollo)

### 2.1 Clonar y Preparar Proyecto

```bash
# Clonar repositorio
git clone https://github.com/usuario/erp-planta-tif.git
cd erp-planta-tif/MVP_PROYECTO

# Verificar estructura
ls -la
# Debe mostrar: backend, frontend, database, README.md
```

### 2.2 Configurar Base de Datos Local

**Opción A: PostgreSQL instalado localmente**

```bash
# 1. Crear base de datos
createdb -U postgres planta_tif

# 2. Ejecutar script de inicialización
psql -U postgres -d planta_tif -f database/init.sql

# 3. Verificar que se creó correctamente
psql -U postgres -d planta_tif -c "\dt"
# Debe mostrar 5 tablas: usuarios, areas, tareas, asignaciones, registros_tiempo
```

**Opción B: Docker (recomendado)**

```bash
# Ejecutar contenedor PostgreSQL
docker run --name postgres-tif \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=planta_tif \
  -p 5432:5432 \
  -d postgres:15

# Esperar 10 segundos a que inicie
sleep 10

# Ejecutar script de inicialización
docker exec -i postgres-tif psql -U postgres -d planta_tif < database/init.sql

# Verificar
docker exec postgres-tif psql -U postgres -d planta_tif -c "\dt"
```

### 2.3 Instalar y Ejecutar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo .env basado en ejemplo
cp .env.example .env

# Editar .env con tus valores
nano .env
# Cambiar:
# DB_HOST=localhost
# DB_PASSWORD=password123
# JWT_SECRET=desarrollo_secreto_seguro

# Iniciar en modo desarrollo (con auto-reload)
npm run dev

# Verificar que inició correctamente
# Deberías ver: "✅ Backend servidor iniciado en puerto 5000"
```

**Test del backend:**
```bash
# En otra terminal
curl http://localhost:5000/api/health
# Respuesta esperada: {"status":"ok","timestamp":"2026-06-25T..."}
```

### 2.4 Instalar y Ejecutar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Editar .env
nano .env
# Configurar:
# REACT_APP_API_URL=http://localhost:5000/api

# Iniciar servidor de desarrollo
npm start

# Abrirá automáticamente http://localhost:3000
```

---

## 3. Testing y Validación

### 3.1 Pruebas Manuales

**Flujo de Supervisor:**
1. Ir a http://localhost:3000
2. Login: santiago@plantaTIF.com / password123
3. Ver "Dashboard Supervisor"
4. Click en "➕ Asignar Nueva Tarea"
5. Seleccionar: Alejandro, "Deshuesar pechuga", cantidad 1, unidad "ton"
6. Click "ASIGNAR" → Debe mostrar "Tarea asignada exitosamente"
7. Tabla debe mostrar tarea con estado "pendiente"

**Flujo de Operario:**
1. Login: alejandro@plantaTIF.com / password123
2. Ver "Pantalla Operario"
3. Debe mostrar "Deshuesar pechuga" asignada
4. Click "▶ INICIAR TAREA" → Cronómetro comienza
5. Esperar 10 segundos
6. Click "✓ TERMINAR TAREA" → "Tarea terminada"
7. Volver a Supervisor y validar

### 3.2 Tests Funcionales

```bash
# Backend - verificar rutas críticas
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"santiago@plantaTIF.com","password":"password123"}'

# Respuesta: JWT token
# Guardar token para próximas requests

TOKEN="tu_token_aqui"

# Obtener tareas del supervisor
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/supervisor/tareas-hoy

# Debe retornar array de tareas
```

---

## 4. Deployment en Producción

### 4.1 Preparar Repositorio GitHub

```bash
# Crear repositorio en GitHub (si no existe)
git remote add origin https://github.com/usuario/erp-planta-tif.git
git branch -M main
git push -u origin main

# Verificar estructura en GitHub
# Debe tener:
# - /MVP_PROYECTO/backend
# - /MVP_PROYECTO/frontend
# - /MVP_PROYECTO/database
```

### 4.2 Backend en Railway.app

**Paso 1: Crear cuenta y proyecto**
- Ir a https://railway.app
- Sign up con GitHub
- Dashboard → New Project

**Paso 2: Agregar PostgreSQL**
```
En Railway Dashboard:
1. Click en "Add Service" 
2. Seleccionar "PostgreSQL"
3. Copiar DATABASE_URL generada
   Ejemplo: postgresql://user:pass@host:5432/dbname
```

**Paso 3: Desplegar Backend**
```
1. En proyecto Railway: Add Service → GitHub Repo
2. Seleccionar: erp-planta-tif
3. Configurar:
   - Root Directory: MVP_PROYECTO/backend
   - Start Command: npm start
   - Environment (variables):
     NODE_ENV=production
     JWT_SECRET=tu_secret_muy_largo_y_seguro_aqui
     PORT=5000
     DATABASE_URL=postgresql://user:pass@host:5432/dbname (from PostgreSQL)
4. Deploy
```

**Paso 4: Ejecutar script de BD**
```bash
# En Railway, conectarse a PostgreSQL y ejecutar init.sql
# Opción A: Por línea de comando local
DATABASE_URL="postgresql://..." psql < database/init.sql

# Opción B: Por Railway UI
# Ir a PostgreSQL service → Connect → pgAdmin
# Ejecutar script en Query Editor
```

**Paso 5: Obtener URL del backend**
```
Railway asigna automáticamente una URL tipo:
https://tu-proyecto-prod.railway.app

Verificar que funciona:
curl https://tu-proyecto-prod.railway.app/api/health
```

### 4.3 Frontend en Vercel

**Paso 1: Crear cuenta en Vercel**
- Ir a https://vercel.com
- Sign up con GitHub

**Paso 2: Importar proyecto**
```
1. Click "New Project"
2. "Import Git Repository"
3. Seleccionar: erp-planta-tif
```

**Paso 3: Configurar deploy**
```
1. Framework Preset: Create React App
2. Root Directory: MVP_PROYECTO/frontend
3. Environment Variables:
   REACT_APP_API_URL=https://tu-proyecto-prod.railway.app/api
4. Deploy
```

**Paso 4: Verificar deploy**
```
Vercel asigna URL automáticamente:
https://tu-app.vercel.app

Ir a esa URL y verificar que pueda hacer login
```

---

## 5. Monitoreo y Mantenimiento

### 5.1 Railway - Monitoreo del Backend

```
En Railway Dashboard:
1. Ir a Backend Service
2. Logs → Ver logs en tiempo real
3. Metrics → CPU, Memoria, Red
4. Settings → Redeploy, Rollback
```

**Verificación diaria:**
```bash
# Health check
curl https://tu-proyecto-prod.railway.app/api/health

# Conexión a BD
curl -H "Authorization: Bearer TOKEN" \
  https://tu-proyecto-prod.railway.app/api/me
```

### 5.2 Vercel - Monitoreo del Frontend

```
En Vercel Dashboard:
1. Project → Analytics
2. Deployments → Ver historial
3. Settings → Dominio, Redeploy
```

### 5.3 PostgreSQL - Backups

**Railway (automático):**
- Railway hace backups diarios automáticos
- Ir a PostgreSQL Service → Backups → Restore

**Manual (recomendado semanal):**
```bash
DATABASE_URL="postgresql://..." pg_dump > backup_$(date +%Y%m%d).sql
# Guardar backup en almacenamiento seguro (Google Drive, S3, etc)
```

### 5.4 Logs y Alertas

**Backend Logs:**
```
Railway → Backend → Logs
- Filtrar por errores
- Monitorear failed requests
- Ver time de respuesta
```

**Configurar alertas:**
```
Railway → Settings → Alerts
- Email alerts si servicio cae
- Alert si uso de recursos > 80%
```

---

## 6. Rollback y Contingencias

### 6.1 Rollback Rápido

**Si algo sale mal en producción:**

**Opción A: Railway (Backend)**
```
1. Railway Dashboard → Backend Service
2. Click en versión anterior en "Deployments"
3. Click "Redeploy"
4. Esperar 2-3 minutos
```

**Opción B: Vercel (Frontend)**
```
1. Vercel Dashboard → Project
2. Deployments → Seleccionar versión anterior
3. Click en "..." → "Promote to Production"
```

### 6.2 Recuperación de BD

**Si los datos se corrompen:**

```bash
# 1. Obtener lista de backups
# En Railway: PostgreSQL → Backups

# 2. Restaurar desde backup
# En Railway UI: Click en backup → Restore

# 3. Verificar integridad
psql < database/verify.sql
```

### 6.3 Plan de Contingencia

| Escenario | Acción |
|-----------|--------|
| Backend está down | Rollback último deployment en Railway |
| Frontend está down | Rollback último deployment en Vercel |
| BD corrupta | Restaurar desde backup automático |
| Pérdida total | Recrear BD con init.sql, restaurar desde backup |
| Acceso no autorizado | Cambiar JWT_SECRET, reiniciar backend |

---

## 7. Checklist de Deployment

### Antes de Producción
- [ ] Todos los tests pasan localmente
- [ ] Variables de entorno configuradas correctamente
- [ ] Base de datos inicializada sin errores
- [ ] Backend responde a health check
- [ ] Frontend carga correctamente
- [ ] Usuario supervisor puede login
- [ ] Usuario operario puede login
- [ ] Asignar y completar una tarea (flujo completo)

### Después de Deployment
- [ ] URL del backend es accesible
- [ ] URL del frontend es accesible
- [ ] Health check retorna ok
- [ ] Login funciona desde producción
- [ ] Crear tarea y completarla (flujo completo)
- [ ] Verificar logs en Railway
- [ ] Verificar analytics en Vercel
- [ ] Backup de BD creado

---

## 8. Actualizar Código en Producción

```bash
# 1. Hacer cambios localmente
# Editar archivos necesarios

# 2. Commit y push
git add .
git commit -m "Fix: descripción del cambio"
git push origin main

# 3. Railway y Vercel detectan automáticamente
# Se inician deployments automáticos
# Esperar 2-5 minutos

# 4. Verificar en producción
curl https://tu-proyecto-prod.railway.app/api/health

# 5. Si algo sale mal
# Rollback manual (ver sección 6.1)
```

---

## 📞 Troubleshooting

### Error: "Connection refused" en login
**Solución:** Verificar que backend está corriendo y REACT_APP_API_URL es correcto

### Error: "JWT token invalid"
**Solución:** Cambiar JWT_SECRET en .env y reiniciar backend

### Error: "Database connection failed"
**Solución:** Verificar DB_HOST, DB_PASSWORD y que PostgreSQL está corriendo

### Cambios no aparecen en producción
**Solución:** 
1. Hacer push a main
2. Esperar deployment automático (2-5 min)
3. Hard refresh en navegador (Ctrl+Shift+R)

---

## 📊 Costos Estimados (Mensual)

| Servicio | Plan | Costo |
|----------|------|-------|
| Railway Backend | Starter | $5 USD |
| Railway PostgreSQL | Starter | $10 USD |
| Vercel Frontend | Hobby | Free |
| GitHub | Free | Free |
| **Total** | | **~$15 USD/mes** |

---

**Última actualización:** Junio 2026
**Versión:** MVP 1.0
