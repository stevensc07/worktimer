import { useEffect, useMemo, useState } from 'react';
import { closeWorkSession } from '../api/attendanceApi';
import { getWorkersOverview } from '../api/metricsApi';
import { createUser } from '../api/userApi';
import InfoHint from './InfoHint';
import LocationMapCard from './LocationMapCard';

function SupervisorHomeTab({ token }) {
  const [overview, setOverview] = useState({ summary: null, workers: [] });
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newRole, setNewRole] = useState('OBRERO');
  const [newPin, setNewPin] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserFeedback, setCreateUserFeedback] = useState('');
  const [stoppingSessionId, setStoppingSessionId] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');

  async function loadOverview(preferredWorkerId = '') {
    setLoading(true);
    setError('');

    try {
      const data = await getWorkersOverview(token);
      setOverview(data);

      const workerIds = new Set(data.workers.map((worker) => String(worker.id)));

      setSelectedWorkerId((current) => {
        if (preferredWorkerId && workerIds.has(String(preferredWorkerId))) {
          return String(preferredWorkerId);
        }

        if (current && workerIds.has(String(current))) {
          return String(current);
        }

        return String(data.workers[0]?.id || '');
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();

    const intervalId = window.setInterval(loadOverview, 45000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreateUser(event) {
    event.preventDefault();
    setCreateUserFeedback('');
    setCreatingUser(true);

    try {
      const createdUser = await createUser(token, {
        employeeId: newEmployeeId.trim().toUpperCase(),
        name: newWorkerName.trim(),
        role: newRole,
        pin: newPin
      });

      setCreateUserFeedback(`Usuario ${createdUser.name} (${createdUser.employeeId}) creado correctamente.`);
      setNewEmployeeId('');
      setNewWorkerName('');
      setNewPin('');

      await loadOverview(createdUser.role === 'OBRERO' ? createdUser.id : '');
    } catch (createError) {
      setCreateUserFeedback(createError.message);
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleStopWorkday(worker) {
    const sessionId = worker?.activeSession?.id;

    if (!sessionId) {
      return;
    }

    setActionFeedback('');
    setStoppingSessionId(String(sessionId));

    try {
      await closeWorkSession(token, sessionId);
      setActionFeedback(`Jornada detenida: ${worker.name}.`);
      await loadOverview(worker.id);
    } catch (stopError) {
      setActionFeedback(stopError.message);
    } finally {
      setStoppingSessionId('');
    }
  }

  const selectedWorker = useMemo(() => {
    if (!overview.workers.length) {
      return null;
    }

    const bySelectedId = overview.workers.find((worker) => String(worker.id) === selectedWorkerId);
    return bySelectedId || overview.workers[0];
  }, [overview.workers, selectedWorkerId]);

  const summary = overview.summary || {
    totalWorkers: 0,
    activeWorkers: 0,
    totalWeekHours: 0,
    completionRate: 0,
    totalPendingTasks: 0,
    totalStoppedTasks: 0,
    totalCompletedTasks: 0
  };

  return (
    <div className="tab-content-grid supervisor-home-grid">
      <section className="panel slide-up">
        <InfoHint
          title="Panel de supervision"
          text="Resumen rapido del equipo: personal, jornadas activas, horas y tareas detenidas."
        />
        <div className="panel-header-row">
          <h2>Panel de Supervisión</h2>
          {loading ? <span className="badge badge-muted">Actualizando...</span> : null}
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <InfoHint title="Personal en obra" text="Cantidad de obreros registrados para supervision." />
            <p className="eyebrow">Personal en obra</p>
            <h3>{summary.totalWorkers}</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Activos ahora" text="Trabajadores que tienen la jornada abierta en este momento." />
            <p className="eyebrow">Activos ahora</p>
            <h3>{summary.activeWorkers}</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Horas semanales" text="Suma de horas trabajadas esta semana en horario de Boston." />
            <p className="eyebrow">Horas semanales</p>
            <h3>{summary.totalWeekHours} h</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Cumplimiento" text="Porcentaje de tareas completadas frente al total de tareas." />
            <p className="eyebrow">Cumplimiento</p>
            <h3>{summary.completionRate}%</h3>
          </article>
          <article className="summary-card">
            <InfoHint title="Tareas detenidas" text="Tareas pausadas manualmente o por el corte automatico de las 6 p.m." />
            <p className="eyebrow">Tareas detenidas</p>
            <h3>{summary.totalStoppedTasks}</h3>
          </article>
        </div>
      </section>

      <section className="panel slide-up">
        <InfoHint
          title="Trabajadores"
          text="Lista de obreros. Permite seleccionar uno, ver su estado y detener su jornada si sigue activa."
        />
        <div className="panel-header-row">
          <h2>Trabajadores</h2>
          <span className="badge badge-muted">{overview.workers.length} registros</span>
        </div>

        <div className="worker-list">
          {overview.workers.map((worker) => (
            <article
              key={worker.id}
              className={`worker-row ${String(worker.id) === String(selectedWorker?.id) ? 'active' : ''}`}
            >
              <InfoHint
                title="Trabajador"
                text="Muestra si el obrero esta trabajando, sus horas de la semana y permite detener su jornada activa."
              />
              <button
                type="button"
                className="worker-row-main"
                onClick={() => setSelectedWorkerId(String(worker.id))}
              >
                <span className="worker-avatar" aria-hidden>{worker.activeSession ? '🟢' : '⚪'}</span>
                <span>
                  <strong>{worker.name}</strong>
                  <small>{worker.employeeId}</small>
                </span>
                <span className="worker-row-meta">
                  <span className={`badge ${worker.activeSession ? 'badge-live' : 'badge-muted'}`}>
                    {worker.activeSession ? 'Trabajando' : 'Fuera'}
                  </span>
                  <small>{worker.weekHours} h/sem</small>
                </span>
              </button>

              {worker.activeSession ? (
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => handleStopWorkday(worker)}
                  disabled={stoppingSessionId === String(worker.activeSession.id)}
                >
                  <span aria-hidden>■</span>
                  <span>{stoppingSessionId === String(worker.activeSession.id) ? 'Deteniendo...' : 'Detener jornada'}</span>
                </button>
              ) : null}
            </article>
          ))}

          {!loading && overview.workers.length === 0 ? (
            <p className="hint">No hay trabajadores registrados para supervisión.</p>
          ) : null}
        </div>

        {error ? <p className="feedback error">{error}</p> : null}
        {actionFeedback ? <p className="feedback" aria-live="polite">{actionFeedback}</p> : null}
      </section>

      <section className="panel slide-up">
        <InfoHint
          title="Crear usuario"
          text="Permite registrar un obrero o supervisor con ID, nombre, rol y PIN de acceso."
        />
        <div className="panel-header-row">
          <h2>Crear Usuario</h2>
          {creatingUser ? <span className="badge badge-muted">Guardando...</span> : null}
        </div>

        <form className="task-create-form" onSubmit={handleCreateUser}>
          <label htmlFor="new-user-employee-id" className="eyebrow">ID de Empleado</label>
          <input
            id="new-user-employee-id"
            type="text"
            value={newEmployeeId}
            onChange={(event) => setNewEmployeeId(event.target.value.toUpperCase())}
            placeholder="Ej: OB-1023"
            required
          />

          <label htmlFor="new-user-name" className="eyebrow">Nombre</label>
          <input
            id="new-user-name"
            type="text"
            value={newWorkerName}
            onChange={(event) => setNewWorkerName(event.target.value)}
            placeholder="Nombre completo"
            required
          />

          <label htmlFor="new-user-role" className="eyebrow">Rol</label>
          <select
            id="new-user-role"
            className="input-select"
            value={newRole}
            onChange={(event) => setNewRole(event.target.value)}
          >
            <option value="OBRERO">Obrero</option>
            <option value="SUPERVISOR">Supervisor</option>
          </select>

          <label htmlFor="new-user-pin" className="eyebrow">PIN / Contraseña</label>
          <input
            id="new-user-pin"
            type="password"
            minLength={4}
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
            placeholder="Mínimo 4 caracteres"
            required
          />

          <button type="submit" className="cta-button" disabled={creatingUser}>
            {creatingUser ? 'Creando usuario...' : 'Crear usuario'}
          </button>
        </form>

        {createUserFeedback ? (
          <p className={`feedback ${createUserFeedback.includes('correctamente') ? '' : 'error'}`}>
            {createUserFeedback}
          </p>
        ) : null}
      </section>

      <LocationMapCard
        title="Ubicación del Trabajador Seleccionado"
        subtitle={selectedWorker ? `${selectedWorker.name} (${selectedWorker.employeeId})` : 'Sin selección'}
        location={selectedWorker?.activeSession?.checkInLocation || null}
      />
    </div>
  );
}

export default SupervisorHomeTab;
