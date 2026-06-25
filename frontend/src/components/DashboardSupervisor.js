import React, { useState, useEffect } from 'react';
import { supervisorService, operarioService, generalService } from '../services/api';
import '../styles/Dashboard.css';

function DashboardSupervisor({ user, onLogout }) {
  const [tareas, setTareas] = useState([]);
  const [operarios, setOperarios] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tareasPorArea, setTareasPorArea] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [formData, setFormData] = useState({
    operario_id: '',
    tarea_id: '',
    cantidad: '',
    unidad: 'kg'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedArea) {
      loadTareasByArea(selectedArea);
    }
  }, [selectedArea]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tareasRes, operariosRes, areasRes] = await Promise.all([
        supervisorService.getTareasHoy(),
        supervisorService.getOperarios(),
        generalService.getAreas()
      ]);

      setTareas(tareasRes.data);
      setOperarios(operariosRes.data);
      setAreas(areasRes.data);
      setSelectedArea(areasRes.data[0]?.id || '');
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTareasByArea = async (area_id) => {
    try {
      const res = await generalService.getTareas(area_id);
      setTareasPorArea(prev => ({ ...prev, [area_id]: res.data }));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleAsignarTarea = async () => {
    if (!formData.operario_id || !formData.tarea_id || !formData.cantidad) {
      alert('Todos los campos son requeridos');
      return;
    }

    try {
      setLoading(true);
      await supervisorService.asignarTarea(formData);
      setFormData({ operario_id: '', tarea_id: '', cantidad: '', unidad: 'kg' });
      setShowModal(false);
      await loadData();
      alert('Tarea asignada exitosamente');
    } catch (error) {
      alert('Error asignando tarea');
    } finally {
      setLoading(false);
    }
  };

  const handleValidarTarea = async (asignacion_id) => {
    try {
      await supervisorService.validarTarea(asignacion_id);
      alert('Tarea validada');
      await loadData();
    } catch (error) {
      alert('Error validando tarea');
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'pendiente': '#ff9800',
      'iniciada': '#2196f3',
      'completada': '#4caf50'
    };
    return colors[estado] || '#999';
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-content">
          <h1>Dashboard Supervisor: {user.nombre}</h1>
          <p>Área: {areas.find(a => a.id === selectedArea)?.nombre}</p>
        </div>
        <button onClick={onLogout} className="btn-logout">Salir</button>
      </div>

      <div className="actions-bar">
        <button onClick={() => setShowModal(true)} className="btn-primary" disabled={loading}>
          ➕ Asignar Nueva Tarea
        </button>
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="select-area"
        >
          {areas.map(area => (
            <option key={area.id} value={area.id}>
              {area.nombre}
            </option>
          ))}
        </select>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Asignar Nueva Tarea</h2>
            <div className="form-group">
              <label>Operario</label>
              <select
                value={formData.operario_id}
                onChange={(e) => setFormData({ ...formData, operario_id: e.target.value })}
                disabled={loading}
              >
                <option value="">-- Seleccionar --</option>
                {operarios.map(op => (
                  <option key={op.id} value={op.id}>{op.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tarea</label>
              <select
                value={formData.tarea_id}
                onChange={(e) => setFormData({ ...formData, tarea_id: e.target.value })}
                disabled={loading}
              >
                <option value="">-- Seleccionar --</option>
                {(tareasPorArea[selectedArea] || []).map(tarea => (
                  <option key={tarea.id} value={tarea.id}>
                    {tarea.tipo} ({tarea.tiempo_standar_min} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cantidad</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Unidad</label>
                <select
                  value={formData.unidad}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  disabled={loading}
                >
                  <option value="kg">kg</option>
                  <option value="ton">Tonelada</option>
                  <option value="cajas">Cajas</option>
                </select>
              </div>
            </div>

            <div className="modal-buttons">
              <button onClick={handleAsignarTarea} className="btn-primary" disabled={loading}>
                {loading ? 'Asignando...' : 'ASIGNAR'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={loading}>
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tareas-container">
        <h2>Tareas de Hoy</h2>
        {loading ? (
          <p>Cargando tareas...</p>
        ) : tareas.length === 0 ? (
          <p>No hay tareas asignadas</p>
        ) : (
          <table className="tareas-table">
            <thead>
              <tr>
                <th>Operario</th>
                <th>Tarea</th>
                <th>Cantidad</th>
                <th>Tiempo Est.</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {tareas.map(tarea => (
                <tr key={tarea.id}>
                  <td>{tarea.operario_nombre}</td>
                  <td>{tarea.tarea_tipo}</td>
                  <td>{tarea.cantidad} {tarea.unidad}</td>
                  <td>{tarea.tiempo_standar_min} min</td>
                  <td>
                    <span
                      className="estado-badge"
                      style={{ backgroundColor: getEstadoColor(tarea.estado) }}
                    >
                      {tarea.estado}
                    </span>
                  </td>
                  <td>
                    {tarea.estado === 'completada' && !tarea.validado && (
                      <button
                        onClick={() => handleValidarTarea(tarea.id)}
                        className="btn-small"
                      >
                        ✓ Validar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default DashboardSupervisor;
