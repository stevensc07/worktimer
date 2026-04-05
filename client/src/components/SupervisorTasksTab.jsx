import { useEffect, useState } from 'react';
import { listTasks } from '../api/taskApi';
import { listWorkers } from '../api/userApi';

const STATUS_LABEL = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada'
};

function SupervisorTasksTab({ token }) {
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadWorkers() {
      try {
        const data = await listWorkers(token);
        setWorkers(data);

        if (data.length > 0) {
          setWorkerId(String(data[0]._id));
        }
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadWorkers();
  }, [token]);

  useEffect(() => {
    async function loadTasks() {
      if (!workerId) {
        setTasks([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await listTasks(token, { workerId });
        setTasks(data);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [token, workerId]);

  return (
    <div className="tab-content-grid supervisor-tasks-grid">
      <section className="panel slide-up">
        <div className="panel-header-row">
          <h2>Monitoreo de Tareas</h2>
          {loading ? <span className="badge badge-muted">Cargando...</span> : null}
        </div>

        <label htmlFor="tasks-worker-select" className="eyebrow">Trabajador</label>
        <select
          id="tasks-worker-select"
          className="input-select"
          value={workerId}
          onChange={(event) => setWorkerId(event.target.value)}
        >
          {workers.map((worker) => (
            <option key={worker._id} value={worker._id}>
              {worker.name} ({worker.employeeId})
            </option>
          ))}
        </select>
      </section>

      <section className="panel slide-up">
        <div className="task-list">
          {tasks.map((task) => (
            <article key={task._id} className="task-card">
              <div className="task-card-header">
                <h3>{task.description}</h3>
                <span className={`badge status-${task.status.toLowerCase()}`}>
                  {STATUS_LABEL[task.status]}
                </span>
              </div>

              <p className="hint">Fotos registradas: {task.googleDriveFileIds?.length || 0}</p>
            </article>
          ))}

          {!loading && tasks.length === 0 ? <p className="hint">Sin tareas para este trabajador.</p> : null}
        </div>

        {error ? <p className="feedback error">{error}</p> : null}
      </section>
    </div>
  );
}

export default SupervisorTasksTab;
