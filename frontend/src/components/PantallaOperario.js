import React, { useState, useEffect } from 'react';
import { operarioService } from '../services/api';
import '../styles/PantallaOperario.css';

function PantallaOperario({ user, onLogout }) {
  const [tareas, setTareas] = useState([]);
  const [tareaActual, setTareaActual] = useState(null);
  const [registroEnProceso, setRegistroEnProceso] = useState(null);
  const [tiempo, setTiempo] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTareas();
  }, []);

  useEffect(() => {
    let interval;
    if (registroEnProceso) {
      interval = setInterval(() => {
        setTiempo(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [registroEnProceso]);

  const loadTareas = async () => {
    try {
      setLoading(true);
      const res = await operarioService.getMisTareas();
      setTareas(res.data);

      // Encontrar tarea actual
      const enProceso = res.data.find(t => t.estado === 'iniciada');
      if (enProceso) {
        setTareaActual(enProceso);
      } else {
        const pendiente = res.data.find(t => t.estado === 'pendiente');
        if (pendiente) {
          setTareaActual(pendiente);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('Error cargando tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarTarea = async () => {
    if (!tareaActual) return;

    try {
      setLoading(true);
      const res = await operarioService.iniciarTarea(tareaActual.id);
      setRegistroEnProceso(res.data);
      setTiempo(0);
      await loadTareas();
    } catch (error) {
      alert('Error iniciando tarea');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminarTarea = async () => {
    if (!tareaActual) return;

    try {
      setLoading(true);
      await operarioService.terminarTarea(tareaActual.id);
      setRegistroEnProceso(null);
      setTiempo(0);
      await loadTareas();
      alert('Tarea terminada. Esperando validación del supervisor.');
    } catch (error) {
      alert('Error terminando tarea');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!tareaActual) return 0;
    const minutosTotales = tareas.reduce((acc, t) => acc + t.tiempo_standar_min, 0);
    const minutosTranscurridos = tareas.reduce((acc, t) => {
      if (t.estado === 'completada') return acc + t.tiempo_standar_min;
      if (t.estado === 'iniciada') return acc + Math.round(tiempo / 60);
      return acc;
    }, 0);
    return Math.round((minutosTranscurridos / minutosTotales) * 100) || 0;
  };

  const proximaTarea = tareas.find(t =>
    t.id !== tareaActual?.id && t.estado === 'pendiente'
  );

  return (
    <div className="operario-container">
      <div className="operario-header">
        <div className="operario-info">
          <h1>{user.nombre}</h1>
          <p>Turno: {new Date().toLocaleDateString('es-ES')}</p>
        </div>
        <button onClick={onLogout} className="btn-logout">Salir</button>
      </div>

      {tareaActual && (
        <div className="tarea-actual">
          <h2>Tarea Actual</h2>
          <div className="tarea-card">
            <h3>{tareaActual.tipo}</h3>
            <p className="descripcion">{tareaActual.descripcion}</p>

            <div className="tarea-info-row">
              <div className="info-item">
                <label>Cantidad</label>
                <p>{tareaActual.cantidad} {tareaActual.unidad}</p>
              </div>
              <div className="info-item">
                <label>Tiempo Estándar</label>
                <p>{formatTime(tareaActual.tiempo_standar_min * 60)}</p>
              </div>
            </div>

            {registroEnProceso && (
              <div className="cronometro">
                <h4>Tiempo Transcurrido</h4>
                <div className="tiempo-display">{formatTime(tiempo)}</div>
              </div>
            )}

            <div className="botones-tarea">
              {!registroEnProceso ? (
                <button
                  onClick={handleIniciarTarea}
                  className="btn-iniciar"
                  disabled={loading || tareaActual.estado === 'completada'}
                >
                  ▶ INICIAR TAREA
                </button>
              ) : (
                <>
                  <button
                    onClick={handleTerminarTarea}
                    className="btn-terminar"
                    disabled={loading}
                  >
                    ✓ TERMINAR TAREA
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {proximaTarea && (
        <div className="proxima-tarea">
          <h2>Próxima Tarea</h2>
          <div className="tarea-preview">
            <h4>{proximaTarea.tipo}</h4>
            <p>{proximaTarea.cantidad} {proximaTarea.unidad}</p>
            <p className="tiempo">Tiempo estimado: {formatTime(proximaTarea.tiempo_standar_min * 60)}</p>
          </div>
        </div>
      )}

      <div className="progreso-turno">
        <h3>Progreso del Turno</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${getProgressPercentage()}%` }}></div>
        </div>
        <p>{getProgressPercentage()}% Completado</p>
      </div>

      <div className="lista-tareas">
        <h2>Todas mis tareas ({tareas.length})</h2>
        <table className="tareas-simple-table">
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Estado</th>
              <th>Tiempo Est.</th>
            </tr>
          </thead>
          <tbody>
            {tareas.map(tarea => (
              <tr key={tarea.id} className={`estado-${tarea.estado}`}>
                <td>{tarea.tipo}</td>
                <td>
                  <span className="badge" style={{
                    backgroundColor:
                      tarea.estado === 'completada' ? '#4caf50' :
                      tarea.estado === 'iniciada' ? '#2196f3' : '#ff9800'
                  }}>
                    {tarea.estado}
                  </span>
                </td>
                <td>{tarea.tiempo_standar_min} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PantallaOperario;
